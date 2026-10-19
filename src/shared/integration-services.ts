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
  /** Admin-only: a non-admin caller must leave this undefined so the key is never sent. */
  points?: number;
}

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
  if (params.points !== undefined) serviceData.points = params.points;

  // Invoke as a method on `hass` so the receiver binding is preserved — the
  // live HA frontend's callService may rely on `this`.
  const result = await hass.callService<{ uid?: string }>(
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
  /** Admin-only: presence of the key triggers the server's admin gate. */
  points?: number;
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
  if (fields.points !== undefined) serviceData.points = fields.points;

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

export async function grantPoints(
  hass: HomeAssistant,
  member: string,
  points: number,
  reason?: string,
): Promise<void> {
  const serviceData: Record<string, unknown> = { member, points };
  if (reason !== undefined) serviceData.reason = reason;
  await hass.callService('lucarne_family', 'grant_points', serviceData);
}

export async function createReward(
  hass: HomeAssistant,
  f: { name: string; cost: number; description?: string; poolable?: boolean },
): Promise<{ id: number }> {
  const serviceData: Record<string, unknown> = { name: f.name, cost: f.cost };
  if (f.description !== undefined) serviceData.description = f.description;
  if (f.poolable !== undefined) serviceData.poolable = f.poolable;
  const result = await hass.callService<{ id: number }>(
    'lucarne_family',
    'create_reward',
    serviceData,
    undefined,
    true,
    true,
  );
  return result?.response ?? { id: -1 };
}

export async function updateReward(
  hass: HomeAssistant,
  rewardId: number,
  f: Partial<{ name: string; cost: number; description: string; poolable: boolean }>,
): Promise<void> {
  const serviceData: Record<string, unknown> = { reward_id: rewardId };
  if (f.name !== undefined) serviceData.name = f.name;
  if (f.cost !== undefined) serviceData.cost = f.cost;
  if (f.description !== undefined) serviceData.description = f.description;
  if (f.poolable !== undefined) serviceData.poolable = f.poolable;
  await hass.callService('lucarne_family', 'update_reward', serviceData);
}

export async function archiveReward(hass: HomeAssistant, rewardId: number): Promise<void> {
  await hass.callService('lucarne_family', 'archive_reward', { reward_id: rewardId });
}

export async function setRewardsSettings(
  hass: HomeAssistant,
  s: { streak_daily_bonus?: number; streak_milestones?: Array<{ days: number; points: number }> },
): Promise<void> {
  const serviceData: Record<string, unknown> = {};
  if (s.streak_daily_bonus !== undefined) serviceData.streak_daily_bonus = s.streak_daily_bonus;
  if (s.streak_milestones !== undefined) serviceData.streak_milestones = s.streak_milestones;
  await hass.callService('lucarne_family', 'set_rewards_settings', serviceData);
}

export async function claimReward(
  hass: HomeAssistant,
  member: string,
  rewardId: number,
  poolWith?: string[],
): Promise<{ claim_id: number; shares: Record<string, number> }> {
  const serviceData: Record<string, unknown> = { member, reward_id: rewardId };
  if (poolWith !== undefined) serviceData.pool_with = poolWith;
  const result = await hass.callService<{ claim_id: number; shares: Record<string, number> }>(
    'lucarne_family',
    'claim_reward',
    serviceData,
    undefined,
    true,
    true,
  );
  return result?.response ?? { claim_id: -1, shares: {} };
}

export async function cancelClaim(hass: HomeAssistant, claimId: number): Promise<void> {
  await hass.callService('lucarne_family', 'cancel_claim', { claim_id: claimId });
}

export async function approveClaim(hass: HomeAssistant, claimId: number): Promise<void> {
  await hass.callService('lucarne_family', 'approve_claim', { claim_id: claimId });
}

export async function rejectClaim(hass: HomeAssistant, claimId: number): Promise<void> {
  await hass.callService('lucarne_family', 'reject_claim', { claim_id: claimId });
}

export async function refundClaim(hass: HomeAssistant, claimId: number): Promise<void> {
  await hass.callService('lucarne_family', 'refund_claim', { claim_id: claimId });
}
