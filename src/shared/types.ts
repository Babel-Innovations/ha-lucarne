export type { HassEntity } from 'home-assistant-js-websocket';
export type { HomeAssistant } from 'custom-card-helpers';

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
