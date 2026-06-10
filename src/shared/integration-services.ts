import type { HomeAssistant, TaskType, TaskSource, TimeOfDay } from './types.js';

export interface AddTaskParams {
  member: string;
  summary: string;
  type: TaskType;
  recurrence?: string;
  icon?: string;
  due?: string;
  source?: TaskSource;
  assignee?: string;
  time_of_day?: TimeOfDay;
  rotation_owners?: string[];
  current_owner?: string;
}

/**
 * `hass.callService` with the `returnResponse` flag. The `custom-card-helpers`
 * type is stale (4 args, `Promise<void>`), but the live HA frontend accepts
 * `(domain, service, data, target, notifyOnError, returnResponse)` and returns
 * `{ context, response }` when the service supports a response.
 */
type CallServiceWithResponse = (
  domain: string,
  service: string,
  serviceData?: Record<string, unknown>,
  target?: unknown,
  notifyOnError?: boolean,
  returnResponse?: boolean,
) => Promise<{ response?: { uid?: string } } | undefined>;

/**
 * Add a task and return the server-generated uid (or `null` if the backend
 * doesn't return one — e.g. an older integration build).
 *
 * The uid lets the chores card reconcile its optimistic insert: it flips the
 * freshly-added task in immediately, then drops the placeholder once the real
 * task with this uid arrives over the (slow on some clients) family-state
 * subscription.
 */
export async function addTask(
  hass: HomeAssistant,
  params: AddTaskParams,
): Promise<string | null> {
  const serviceData: Record<string, unknown> = {
    member: params.member,
    summary: params.summary,
    type: params.type,
  };
  if (params.recurrence !== undefined) serviceData.recurrence = params.recurrence;
  if (params.icon !== undefined) serviceData.icon = params.icon;
  if (params.due !== undefined) serviceData.due = params.due;
  if (params.source !== undefined) serviceData.source = params.source;
  if (params.assignee !== undefined) serviceData.assignee = params.assignee;
  if (params.time_of_day !== undefined) serviceData.time_of_day = params.time_of_day;
  if (params.rotation_owners !== undefined) serviceData.rotation_owners = params.rotation_owners;
  if (params.current_owner !== undefined) serviceData.current_owner = params.current_owner;

  // Invoke as a method on `hass` so the receiver binding is preserved — the
  // live HA frontend's callService may rely on `this`. (Cast only widens the
  // stale 4-arg type to accept the returnResponse flag.)
  const result = await (hass as unknown as { callService: CallServiceWithResponse }).callService(
    'lucarne_family',
    'add_task',
    serviceData,
    undefined,
    true,
    true,
  );
  return result?.response?.uid ?? null;
}

export interface UpdateTaskMetadataFields {
  type?: TaskType;
  recurrence?: string;
  icon?: string;
  assignee?: string;
  time_of_day?: TimeOfDay;
  rotation_owners?: string[];
  current_owner?: string;
}

export async function updateTaskMetadata(
  hass: HomeAssistant,
  uid: string,
  fields: UpdateTaskMetadataFields,
): Promise<void> {
  const serviceData: Record<string, unknown> = { uid };
  if (fields.type !== undefined) serviceData.type = fields.type;
  if (fields.recurrence !== undefined) serviceData.recurrence = fields.recurrence;
  if (fields.icon !== undefined) serviceData.icon = fields.icon;
  if (fields.assignee !== undefined) serviceData.assignee = fields.assignee;
  if (fields.time_of_day !== undefined) serviceData.time_of_day = fields.time_of_day;
  if (fields.rotation_owners !== undefined) serviceData.rotation_owners = fields.rotation_owners;
  if (fields.current_owner !== undefined) serviceData.current_owner = fields.current_owner;

  await hass.callService('lucarne_family', 'update_task_metadata', serviceData);
}

export async function deleteTask(hass: HomeAssistant, uid: string): Promise<void> {
  await hass.callService('lucarne_family', 'delete_task', { uid });
}

export async function uploadAvatar(
  hass: HomeAssistant,
  memberSlug: string,
  file: File,
): Promise<void> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  const image_data = btoa(binary);

  await hass.callService('lucarne_family', 'upload_avatar', {
    member: memberSlug,
    image_data,
    mime_type: file.type,
  });
}

export async function setMemberAvatar(
  hass: HomeAssistant,
  memberSlug: string,
  avatar: string,
): Promise<void> {
  await hass.callService('lucarne_family', 'set_member_avatar', {
    member: memberSlug,
    avatar,
  });
}
