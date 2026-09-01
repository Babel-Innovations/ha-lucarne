import type { Connection, Context, HassEntities, HassServiceTarget } from 'home-assistant-js-websocket';

export type { HassEntity } from 'home-assistant-js-websocket';

/** Result of `hass.callService` when called with the `returnResponse` flag. */
export interface ServiceCallResponse<T = unknown> {
  context: Context;
  response?: T;
}

/**
 * The slice of the frontend's `hass` object Lucarne actually reads.
 *
 * Declared here rather than re-exported from `custom-card-helpers`, which was
 * the only path to the deprecated `@formatjs/intl-utils` (#130). Widen it only
 * when a card starts reading something new, so the compiler keeps naming our
 * real surface on HA core.
 *
 * Read as a *consumer* contract, not a structural supertype of HA's own object:
 * `callService`'s void arm is a deliberate narrowing (see below) that HA core's
 * signature would not satisfy. Nothing assigns the real `hass` to this type —
 * cards receive it unchecked from HA, and test mocks reach it through an
 * unchecked cast — so the narrowing costs nothing and buys the call-site safety.
 *
 * `callService` is typed to the live frontend's six-argument shape.
 * `custom-card-helpers` still described the stale four-argument
 * `Promise<void>` version, which is why call sites needing a service response
 * used to cast around it.
 */
export interface HomeAssistant {
  states: HassEntities;
  connection: Connection;
  callApi: <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, unknown>,
  ) => Promise<T>;

  /**
   * Overloaded on `returnResponse` — method shorthand rather than the property
   * style used above, because the arrow-property form cannot carry overloads.
   * A response is readable exactly when the flag asked HA for one, so a call
   * that never requested one cannot reach for a `.response` that a service
   * without `supports_response` never sends. HA itself resolves `{context}` on
   * both paths; `void` describes what a caller may read, not what arrives.
   *
   * Naming `<T>` selects the response arm, so it requires all six arguments —
   * a three-argument call with a type argument reports an arity error rather
   * than anything about `returnResponse`.
   *
   * `| undefined` on that arm is belt-and-braces for an upstream we track by
   * hand; the "service answered without a payload" case is already carried by
   * `response?:` being optional, which is `addTask`'s second `?.`.
   */
  callService<T = unknown>(
    domain: string,
    service: string,
    serviceData: Record<string, unknown> | undefined,
    target: HassServiceTarget | undefined,
    notifyOnError: boolean | undefined,
    returnResponse: true,
  ): Promise<ServiceCallResponse<T> | undefined>;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: HassServiceTarget,
    notifyOnError?: boolean,
    returnResponse?: false,
  ): Promise<void>;
}

export type TaskType = 'routine' | 'chore' | 'rotating';
export type TaskSource = 'manual' | 'template' | 'apple';
export type TimeOfDay = 'anytime' | 'morning' | 'afternoon' | 'night';

export const TIME_OF_DAY_VALUES: readonly TimeOfDay[] = [
  'anytime',
  'morning',
  'afternoon',
  'night',
] as const;

/**
 * Coerce a runtime value into a TimeOfDay. Anything outside the four known
 * buckets (typos, legacy imports, future enum extensions, payloads that
 * bypassed the voluptuous validator) collapses to 'anytime' rather than
 * leaving the UI in a broken state with a dropdown selection the renderer
 * can't display.
 */
export function coerceTimeOfDay(value: unknown): TimeOfDay {
  return typeof value === 'string'
    && (TIME_OF_DAY_VALUES as readonly string[]).includes(value)
    ? (value as TimeOfDay)
    : 'anytime';
}

export interface MemberSummary {
  slug: string;
  name: string;
  color: string;
  avatar: string | null;
  todo_entity_id: string;
  streak_counter_id: string;
}

export interface TaskMetadata {
  item_uid: string;
  member_slug: string;
  assignee_slug: string;
  type: TaskType;
  recurrence: string;
  icon: string;
  source: TaskSource;
  time_of_day?: TimeOfDay;
  rotation_owners?: string[];
  current_owner?: string;
}

export interface RenderableTask {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
  due: string | null;
  description: string;
  /** See `TodoItem.completed` — carried through so cards can date a completion. */
  completed?: string;
  metadata: TaskMetadata;
}

export interface CalendarEvent {
  start: string;
  end: string;
  summary: string;
  description?: string;
  location?: string;
  uid?: string;
  pending?: boolean;
  rrule?: string;
  recurrence_id?: string;
}

export interface WeatherForecast {
  datetime: string;
  temperature: number;
  templow?: number;
  condition: string;
  precipitation?: number;
  precipitation_probability?: number;
}

export interface TodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
  due?: string;
  description?: string;
  /**
   * ISO timestamp of when the item was marked completed, straight from HA's own
   * `TodoItem.completed` (`local_todo` populates it; `todo.get_items` serializes
   * every dataclass field). Absent on backends that never set it — callers must
   * treat "missing" as "cannot be dated", never as "completed long ago".
   */
  completed?: string;
}

export interface PersonPresence {
  entity_id: string;
  name: string;
  is_home: boolean;
}

export interface CalendarConfig {
  entity: string;
  color: string;
  /**
   * Deprecated and ignored at display time. Previously a per-card label
   * override; the cards now read the calendar entity's `friendly_name`
   * (editable via Settings → Devices & services → Entities). Kept in the
   * type so old saved configs / YAML still parse without errors.
   */
  label?: string;
}
