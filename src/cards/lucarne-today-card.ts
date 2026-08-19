import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { LucarneCardBase, LucarneConfigError } from '../shared/card-base.js';
import { fetchCalendarEvents, subscribeTodoItems } from '../shared/ha-subscriptions.js';
import { installPreviewColumnOverride, type PreviewOverrideHandle } from '../shared/grid-preview-override.js';
import { subscribeFamilyState } from '../shared/family-subscription.js';
import type { FamilyState } from '../shared/family-subscription.js';
import { parseRRule, isRoutineDueToday } from '../shared/recurrence.js';
import { STRINGS } from '../shared/strings.js';
import type { HomeAssistant, CalendarConfig, CalendarEvent, TodoItem, RenderableTask, MemberSummary, TaskMetadata } from '../shared/types.js';

import '../components/agenda-strip.js';
import '../components/weather-block.js';
import '../components/tasks-summary.js';
import '../components/presence-pills.js';
import '../components/family-ready-pill.js';

export type TodaySectionId = 'calendar' | 'weather' | 'tasks';
export const DEFAULT_SECTION_ORDER: readonly TodaySectionId[] = ['calendar', 'weather', 'tasks'] as const;

/**
 * Normalize a user-supplied section_order: drop unknown / duplicate ids and
 * append any default sections that were omitted so old configs and partial
 * lists still render every section in a sensible position.
 */
export function normalizeSectionOrder(input: readonly string[] | undefined): TodaySectionId[] {
  const seen = new Set<TodaySectionId>();
  const out: TodaySectionId[] = [];
  for (const raw of input ?? []) {
    if ((DEFAULT_SECTION_ORDER as readonly string[]).includes(raw) && !seen.has(raw as TodaySectionId)) {
      seen.add(raw as TodaySectionId);
      out.push(raw as TodaySectionId);
    }
  }
  for (const s of DEFAULT_SECTION_ORDER) {
    if (!seen.has(s)) out.push(s);
  }
  return out;
}

export interface LucarneTodayCardConfig {
  type: 'custom:lucarne-today-card';
  title?: string;
  calendars: CalendarConfig[];
  weather?: string;
  tasks?: string;
  presence?: { entity: string; name: string }[];
  /** If true, the agenda shows today + tomorrow; otherwise today only. */
  agenda_show_tomorrow?: boolean;
  /** If true, ignores tasks: setting and reads household tasks from the integration */
  household_tasks_from_integration?: boolean;
  /** If true, shows N/M members ready pill in header */
  show_family_ready_pill?: boolean;
  /** Max number of tasks to display in the tasks section (default 5). */
  max_tasks?: number;
  /** If true, completing a task pulls the next backlog task into view (default false). */
  refill_tasks_on_complete?: boolean;
  /** Order of vertical sections (default: calendar → weather → tasks) */
  section_order?: TodaySectionId[];
  /** When true, forward card errors to a Home Assistant persistent_notification. */
  debug?: boolean;
}

(window as Window & typeof globalThis & { customCards?: object[] }).customCards =
  (window as Window & typeof globalThis & { customCards?: object[] }).customCards || [];
(window as Window & typeof globalThis & { customCards?: object[] }).customCards!.push({
  type: 'lucarne-today-card',
  name: 'Lucarne Today',
  description: 'Family agenda + weather + tasks + presence',
  preview: true,
});

@customElement('lucarne-today-card')
export class LucarneTodayCard extends LucarneCardBase<LucarneTodayCardConfig> {
  static styles = [
    lucarneStyles,
    css`
      :host {
        display: block;
        width: 100%;
        font-family: var(--primary-font-family, sans-serif);
        container-type: inline-size;
      }
      ha-card {
        width: 100%;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        /* Fixed outer height shared with the Calendar card; the body flexes to
           fill the remainder below the header. */
        height: var(--lucarne-card-fill-height);
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-md);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .card-body {
        display: flex;
        flex-direction: column;
        /* Fill the space below the header; section-tasks absorbs the slack when
           content is short, and the body scrolls if it would overflow the fixed
           card height instead of being clipped. */
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }
      .section + .section {
        border-top: 1px solid rgba(0, 0, 0, 0.07);
      }
      /* Tasks absorb any vertical slack so the card fills to the shared height
         with the list at the bottom rather than a blank gap. */
      .section-tasks {
        flex: 1 1 auto;
        min-height: 0;
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;

  @state() private _config?: LucarneTodayCardConfig;
  @state() private _calendarEvents: Map<string, CalendarEvent[]> = new Map();
  @state() private _forecast: { temperature: number; templow?: number; condition: string; datetime: string; precipitation_probability?: number }[] = [];
  @state() private _todoItems: TodoItem[] = [];
  @state() private _familyState: FamilyState | null = null;
  /**
   * Optimistic toggle overrides keyed by task uid. A tap flips the row here
   * immediately — the server round-trip + push is too slow to feel live on an
   * idle WKWebView kiosk — then `_reconcileOptimistic` drops each entry once the
   * real status catches up. Reverted if the service call fails. Mirrors the
   * chores card's `_optimistic`.
   */
  @state() private _optimistic: Map<string, RenderableTask['status']> = new Map();

  private _calendarIntervalId?: ReturnType<typeof setInterval>;
  private _todoUnsub?: () => void;
  private _unsubFamily?: () => void;
  private _fetchingForecast = false;
  private _lastWeatherState = '';
  private _previewOverride?: PreviewOverrideHandle | null;
  private _previewOverrideRaf?: number;

  /** Invoked by LucarneCardBase.setConfig(), which owns the error boundary. */
  protected applyConfig(config: LucarneTodayCardConfig) {
    if (!config.calendars || !Array.isArray(config.calendars) || config.calendars.length === 0) {
      throw new LucarneConfigError('lucarne-today-card: "calendars" must be a non-empty array');
    }
    for (const cal of config.calendars) {
      // `cal` can be null: a bare `-` under `calendars:` is a common hand-edit slip,
      // and YAML makes that a null list item. Guard before dereferencing so this
      // stays a LucarneConfigError the user can read, rather than a TypeError the
      // base boundary would contain as an internal bug (leaving HA to accept the
      // broken config).
      if (!cal || typeof cal !== 'object' || !cal.entity || !cal.color) {
        throw new LucarneConfigError('lucarne-today-card: each calendar entry requires "entity" and "color"');
      }
    }
    this._config = config;
    // If already connected (Lovelace reuses the element across editor saves), refresh subscriptions.
    if (this.isConnected) {
      this._teardownSubscriptions();
      this._setupSubscriptions();
    }
  }

  static getConfigElement() {
    return document.createElement('lucarne-today-card-editor');
  }

  static getStubConfig(hass: HomeAssistant): LucarneTodayCardConfig {
    const calendarIds = Object.keys(hass.states)
      .filter((id) => id.startsWith('calendar.'))
      .slice(0, 3);

    const palettes = ['#a8d8b9', '#a8c5e8', '#c8b4e0'];
    const calendars: CalendarConfig[] = calendarIds.map((id, i) => ({
      entity: id,
      color: palettes[i] ?? '#a8d8b9',
    }));

    const hasWeather = 'weather.forecast_home' in hass.states;

    return {
      type: 'custom:lucarne-today-card',
      title: STRINGS.today,
      calendars: calendars.length ? calendars : [{ entity: 'calendar.example', color: '#a8d8b9' }],
      weather: hasWeather ? 'weather.forecast_home' : undefined,
    };
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: 6, rows: 'auto', min_columns: 3, max_columns: 6 };
  }

  connectedCallback() {
    super.connectedCallback();
    this._setupSubscriptions();
    this._previewOverrideRaf = requestAnimationFrame(() => {
      this._previewOverrideRaf = undefined;
      if (!this.isConnected) return;
      this._previewOverride = installPreviewColumnOverride(this);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._teardownSubscriptions();
    if (this._previewOverrideRaf !== undefined) {
      cancelAnimationFrame(this._previewOverrideRaf);
      this._previewOverrideRaf = undefined;
    }
    this._previewOverride?.uninstall();
    this._previewOverride = undefined;
  }

  private _setupSubscriptions() {
    if (!this._config || !this.hass) return;
    this._fetchCalendarEvents();
    if (this._config.weather) this._fetchForecast();
    // Refresh both calendars and forecast on the same periodic timer — forecast attributes
    // can update (high/low/precip) without the entity state string changing.
    this._calendarIntervalId = setInterval(() => {
      this._fetchCalendarEvents();
      if (this._config?.weather) this._fetchForecast();
    }, 5 * 60 * 1000);
    if (this._config.tasks && !this._config.household_tasks_from_integration) {
      this._todoUnsub = subscribeTodoItems(this.hass, this._config.tasks, (items) => {
        this._todoItems = items;
        this._reconcileOptimistic();
      });
    }
    // Always subscribe to family state when the user has any task surface enabled.
    // The integration provides task metadata (icons, member ownership) used to
    // enrich BOTH integration mode and raw mode — without this, raw-mode rows
    // render with no emoji and no owner avatar even when the entity is actually
    // a family-member todo the integration tracks.
    const wantsFamily =
      this._config.household_tasks_from_integration ||
      this._config.show_family_ready_pill ||
      !!this._config.tasks;
    if (wantsFamily) {
      this._unsubFamily = subscribeFamilyState(this.hass, (state) => {
        this._familyState = state;
        this._reconcileOptimistic();
      });
    }
  }

  private _teardownSubscriptions() {
    clearInterval(this._calendarIntervalId);
    this._todoUnsub?.();
    this._todoUnsub = undefined;
    this._unsubFamily?.();
    this._unsubFamily = undefined;
    this._calendarIntervalId = undefined;
  }

  updated(changedProps: Map<string, unknown>) {
    super.updated(changedProps);
    if (!changedProps.has('hass') || !this._config) return;

    // Bootstrap subscriptions the first time hass becomes available (Lovelace may
    // connect the element before setting hass, so connectedCallback can run too early).
    const prevHass = changedProps.get('hass');
    if (!prevHass && this.hass && !this._calendarIntervalId) {
      this._setupSubscriptions();
      return;
    }

    const weatherEntityId = this._config.weather;
    if (weatherEntityId) {
      const weatherState = this.hass.states[weatherEntityId]?.state;
      if (weatherState && weatherState !== this._lastWeatherState) {
        this._lastWeatherState = weatherState;
        this._fetchForecast();
      }
    }
  }

  private async _fetchCalendarEvents() {
    if (!this._config || !this.hass) return;
    const entityIds = this._config.calendars.map((c) => c.entity);
    // Anchor the fetch to the start of the local day, not "now" — HA's calendar
    // API only returns events overlapping [start, end], so fetching from "now"
    // drops events that already ended earlier today. The agenda strip wants
    // today's full day so past events stay visible (dimmed).
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { events: map } = await fetchCalendarEvents(this.hass, entityIds, start, end);

    // Tag events with entity_id prefix in uid for color lookup
    const tagged = new Map<string, CalendarEvent[]>();
    for (const [entityId, events] of map.entries()) {
      tagged.set(
        entityId,
        events.map((e) => ({ ...e, uid: `${entityId}::${e.uid ?? e.summary}` })),
      );
    }
    this._calendarEvents = tagged;
  }

  private async _fetchForecast() {
    if (this._fetchingForecast || !this._config?.weather || !this.hass) return;
    this._fetchingForecast = true;
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        response: Record<string, { forecast: { temperature: number; templow?: number; condition: string; datetime: string; precipitation_probability?: number }[] }>;
      }>({
        type: 'call_service',
        domain: 'weather',
        service: 'get_forecasts',
        service_data: { type: 'daily' },
        target: { entity_id: this._config.weather },
        return_response: true,
      });
      this._forecast = result?.response?.[this._config.weather]?.forecast ?? [];
    } catch (err) {
      console.warn(`[lucarne] weather.get_forecasts failed for ${this._config.weather}:`, err);
      this._forecast = [];
    } finally {
      this._fetchingForecast = false;
    }
  }

  private get _mergedEvents(): CalendarEvent[] {
    const all: CalendarEvent[] = [];
    for (const events of this._calendarEvents.values()) {
      all.push(...events);
    }
    return all;
  }

  private get _calendarColorMap(): Map<string, string> {
    const m = new Map<string, string>();
    for (const cal of this._config?.calendars ?? []) {
      m.set(cal.entity, cal.color);
    }
    return m;
  }

  private get _householdTasks(): RenderableTask[] {
    return this._familyState?.tasksByMember.get('household') ?? [];
  }

  private get _familyMembers(): MemberSummary[] {
    return this._familyState?.members ?? [];
  }

  private get _familyTasksByMember(): Map<string, RenderableTask[]> {
    return this._familyState?.tasksByMember ?? new Map();
  }

  /**
   * Raw todo items enriched with integration metadata when available so they
   * render the same emoji + owner avatar as in chores card. Falls back to the
   * member whose `todo_entity_id` matches the configured raw entity, so even
   * tasks added through HA's todo UI (without an integration tag) still pick
   * up the right owner.
   */
  private get _enrichedRawTasks(): RenderableTask[] {
    if (!this._config?.tasks) return [];
    const metaByUid = this._familyState?.taskMetadataByUid ?? new Map<string, TaskMetadata>();
    const fallbackSlug =
      this._familyState?.members.find((m) => m.todo_entity_id === this._config!.tasks)?.slug ?? '';
    return this._todoItems.map((item) => {
      const meta = metaByUid.get(item.uid);
      const metadata: TaskMetadata = meta ?? {
        item_uid: item.uid,
        member_slug: fallbackSlug,
        assignee_slug: '',
        type: 'chore',
        recurrence: '',
        icon: '',
        source: 'manual',
      };
      return {
        uid: item.uid,
        summary: item.summary,
        status: item.status,
        due: item.due ?? null,
        description: item.description ?? '',
        metadata,
      };
    });
  }

  private async _handleTaskToggle(e: Event) {
    const { task } = (e as CustomEvent<{ task: RenderableTask }>).detail;
    if (!this.hass) return;

    const newStatus = task.status === 'completed' ? 'needs_action' : 'completed';
    const ownerEntityId = this._resolveTaskEntityId(task);
    if (!ownerEntityId) return;

    // Flip the row immediately; `_reconcileOptimistic` clears the override once
    // the server confirms. Revert if the service call fails so the UI stays true.
    this._optimistic = new Map(this._optimistic).set(task.uid, newStatus);
    try {
      await this.hass.callService(
        'todo',
        'update_item',
        { item: task.uid, status: newStatus },
        { entity_id: ownerEntityId },
      );
    } catch (err) {
      const reverted = new Map(this._optimistic);
      reverted.delete(task.uid);
      this._optimistic = reverted;
      throw err;
    }
  }

  /** Apply any optimistic status override to a task (no-op if none / already matched). */
  private _applyOptimistic = (t: RenderableTask): RenderableTask => {
    const optimistic = this._optimistic.get(t.uid);
    return optimistic && optimistic !== t.status ? { ...t, status: optimistic } : t;
  };

  /**
   * Drop optimistic overrides once the authoritative source (raw todo items or
   * integration family state) reports the expected status, or the task vanishes.
   * Called whenever either source updates so the map can't grow stale.
   */
  private _reconcileOptimistic() {
    if (this._optimistic.size === 0) return;
    const statusByUid = new Map<string, RenderableTask['status']>();
    for (const item of this._todoItems) statusByUid.set(item.uid, item.status);
    if (this._familyState) {
      for (const tasks of this._familyState.tasksByMember.values()) {
        for (const t of tasks) statusByUid.set(t.uid, t.status);
      }
    }
    let changed = false;
    const next = new Map(this._optimistic);
    for (const [uid, status] of next) {
      const real = statusByUid.get(uid);
      if (real === undefined || real === status) {
        next.delete(uid);
        changed = true;
      }
    }
    if (changed) this._optimistic = next;
  }

  private _handleTaskLongPress(e: Event) {
    const { task } = (e as CustomEvent<{ task: RenderableTask }>).detail;
    const entityId = this._resolveTaskEntityId(task);
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _resolveTaskEntityId(task: RenderableTask): string | undefined {
    // Integration mode is opt-in via household_tasks_from_integration. Gate on the
    // config flag — not on _familyState presence — because show_family_ready_pill
    // also populates _familyState, and in that combo raw-mode clicks would otherwise
    // be misrouted to todo.lucarne_household.
    if (this._config?.household_tasks_from_integration && this._familyState) {
      const slug = task.metadata.member_slug;
      if (slug === 'household') return 'todo.lucarne_household';
      const owner = this._familyState.members.find((m) => m.slug === slug);
      if (owner?.todo_entity_id) return owner.todo_entity_id;
      return undefined;
    }
    // Raw mode: every task belongs to the configured todo entity.
    return this._config?.tasks;
  }

  private _renderCalendarSection() {
    return html`
      <div class="section section-calendar" data-section="calendar">
        <lucarne-agenda-strip
          .events=${this._mergedEvents}
          .calendarColors=${this._calendarColorMap}
          .windowDays=${this._config?.agenda_show_tomorrow ? 2 : 1}
        ></lucarne-agenda-strip>
      </div>
    `;
  }

  private _renderWeatherSection() {
    const weatherEntity = this._config?.weather ? this.hass?.states[this._config.weather] : undefined;
    return html`
      <div class="section section-weather" data-section="weather">
        <lucarne-weather-block
          .weatherEntity=${weatherEntity}
          .forecast=${this._forecast}
        ></lucarne-weather-block>
      </div>
    `;
  }

  /**
   * Resolve the task limit, clamping to a sane minimum. The editor enforces
   * min=1, but a hand-written YAML config can pass 0/negative/non-integer values
   * which would otherwise hide all tasks (or drop items via a negative slice in
   * refill mode), so guard here too.
   */
  private get _maxTasks(): number {
    const v = this._config?.max_tasks;
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 5;
  }

  private _renderTasksSection(showRawTasks: boolean, showIntegrationTasks: boolean) {
    if (!showRawTasks && !showIntegrationTasks) return '';
    // Both modes now flow through the same `renderableTasks` path so emoji + owner
    // avatar render uniformly. Raw mode enriches items with integration metadata
    // when available (member_slug, icon); integration mode passes household tasks.
    // Rotating tasks belong to the chores card (they surface in the current
    // owner's column and advance at the daily-reset window) — they may not be
    // relevant on any given day, so they never appear in the Today card.
    const now = new Date();
    const tasks = (showIntegrationTasks ? this._householdTasks : this._enrichedRawTasks)
      .filter((t) => {
        if (t.metadata.type === 'rotating') return false;
        if (t.metadata.type === 'routine') {
          // Mirror the chores card (commit 844647978fad): a scheduled routine is
          // only active on days its RRULE fires. 'none' (empty/legacy "every day")
          // and 'unknown' (valid server-side but outside the JS parser's editable
          // set) have no card-evaluable schedule — keep them visible every day;
          // the integration's reset + streak math still evaluate the real RRULE.
          const parsed = parseRRule(t.metadata.recurrence);
          if (parsed.mode === 'none' || parsed.mode === 'unknown') return true;
          return isRoutineDueToday(parsed, now);
        }
        return true;
      })
      .map(this._applyOptimistic);
    const entityId = showIntegrationTasks ? 'todo.lucarne_household' : this._config?.tasks;
    return html`
      <div
        class="section section-tasks"
        data-section="tasks"
        @task-toggle=${this._handleTaskToggle}
        @task-long-press=${this._handleTaskLongPress}
      >
        <lucarne-tasks-summary
          .integrationMode=${true}
          .renderableTasks=${tasks}
          .members=${this._familyMembers}
          .todoEntityId=${entityId}
          .limit=${this._maxTasks}
          .refillOnComplete=${this._config?.refill_tasks_on_complete ?? false}
        ></lucarne-tasks-summary>
      </div>
    `;
  }

  protected renderContent() {
    if (!this._config) return html``;

    const presenceEntries = (this._config.presence ?? []).map((p) => ({
      name: p.name,
      isHome: this.hass?.states[p.entity]?.state === 'on',
    }));

    // Only enable integration-backed sections when the family subscription is loaded and healthy.
    // When integrationError is non-null (integration missing or failed), suppress these sections
    // rather than rendering a misleading empty state.
    const integrationOk = this._familyState !== null && this._familyState.integrationError === null;
    const showFamilyPill = (this._config.show_family_ready_pill ?? false) && integrationOk;
    const showIntegrationTasks = (this._config.household_tasks_from_integration ?? false) && integrationOk;
    const showRawTasks = !(this._config.household_tasks_from_integration ?? false) && !!this._config.tasks;

    const order = normalizeSectionOrder(this._config.section_order);

    return html`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${this._config.title ?? STRINGS.today}</h2>
          <div class="header-right">
            ${presenceEntries.length > 0
              ? html`<lucarne-presence-pills .entries=${presenceEntries}></lucarne-presence-pills>`
              : ''}
            ${showFamilyPill
              ? html`<lucarne-family-ready-pill
                  .members=${this._familyMembers}
                  .tasksByMember=${this._familyTasksByMember}
                ></lucarne-family-ready-pill>`
              : ''}
          </div>
        </div>
        <div class="card-body">
          ${order.map((id) => {
            switch (id) {
              case 'calendar':
                return this._renderCalendarSection();
              case 'weather':
                return this._renderWeatherSection();
              case 'tasks':
                return this._renderTasksSection(showRawTasks, showIntegrationTasks);
            }
          })}
        </div>
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-today-card': LucarneTodayCard;
  }
}
