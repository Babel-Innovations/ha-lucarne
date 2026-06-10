import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addTask, updateTaskMetadata, deleteTask, uploadAvatar } from '../../src/shared/integration-services.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';
import type { HomeAssistant } from '../../src/shared/types.js';

function makeHass() {
  const fakeHass = makeFakeHass();
  return fakeHass as unknown as HomeAssistant & { calls: { callService: { domain: string; service: string; payload: Record<string, unknown> }[] } };
}

describe('addTask', () => {
  it('calls lucarne_family.add_task with required fields', async () => {
    const hass = makeHass();
    await addTask(hass, { member: 'anna', summary: 'Brush teeth', type: 'routine' });

    const call = hass.calls.callService[0];
    assert.equal(call.domain, 'lucarne_family');
    assert.equal(call.service, 'add_task');
    assert.equal(call.payload.member, 'anna');
    assert.equal(call.payload.summary, 'Brush teeth');
    assert.equal(call.payload.type, 'routine');
    assert.equal(call.payload.assignee, undefined, 'assignee not sent when not provided');
  });

  it('sends optional fields when provided', async () => {
    const hass = makeHass();
    await addTask(hass, {
      member: 'anna',
      summary: 'Water plants',
      type: 'chore',
      recurrence: 'FREQ=WEEKLY;BYDAY=MO',
      icon: '🌱',
      due: '2026-05-25',
      source: 'manual',
    });

    const call = hass.calls.callService[0];
    assert.equal(call.payload.recurrence, 'FREQ=WEEKLY;BYDAY=MO');
    assert.equal(call.payload.icon, '🌱');
    assert.equal(call.payload.due, '2026-05-25');
    assert.equal(call.payload.source, 'manual');
  });

  it('sends assignee for household tasks', async () => {
    const hass = makeHass();
    await addTask(hass, { member: 'household', summary: 'Feed dog', type: 'chore', assignee: 'anna' });

    const call = hass.calls.callService[0];
    assert.equal(call.payload.member, 'household');
    assert.equal(call.payload.assignee, 'anna');
  });

  it('does NOT send assignee field when not provided', async () => {
    const hass = makeHass();
    await addTask(hass, { member: 'anna', summary: 'Make bed', type: 'routine' });

    const call = hass.calls.callService[0];
    assert.ok(!('assignee' in call.payload), 'assignee must not be sent for non-household tasks');
  });

  it('sends rotation_owners and current_owner for rotating tasks', async () => {
    const hass = makeHass();
    await addTask(hass, {
      member: 'household',
      summary: 'Clean bathroom',
      type: 'rotating',
      rotation_owners: ['alice', 'bob', 'cara'],
    });

    const call = hass.calls.callService[0];
    assert.equal(call.payload.member, 'household');
    assert.equal(call.payload.type, 'rotating');
    assert.deepEqual(call.payload.rotation_owners, ['alice', 'bob', 'cara']);
    assert.equal(call.payload.current_owner, undefined, 'current_owner not sent when not provided');
  });

  it('does NOT send rotation_owners when not provided', async () => {
    const hass = makeHass();
    await addTask(hass, { member: 'anna', summary: 'Make bed', type: 'routine' });

    const call = hass.calls.callService[0];
    assert.ok(!('rotation_owners' in call.payload), 'rotation_owners must not be sent when not provided');
  });

  it('returns the uid from the service response', async () => {
    const base = makeFakeHass();
    const hass = {
      ...base,
      async callService() {
        return { response: { uid: 'srv-uid-1' } };
      },
    } as unknown as HomeAssistant;
    const uid = await addTask(hass, { member: 'anna', summary: 'Brush teeth', type: 'routine' });
    assert.equal(uid, 'srv-uid-1');
  });

  it('returns null when the backend returns no response (older build)', async () => {
    const hass = makeHass();
    const uid = await addTask(hass, { member: 'anna', summary: 'Brush teeth', type: 'routine' });
    assert.equal(uid, null);
  });
});

describe('updateTaskMetadata', () => {
  it('calls lucarne_family.update_task_metadata with uid + fields', async () => {
    const hass = makeHass();
    await updateTaskMetadata(hass, 'uid-abc', { type: 'chore', icon: '🐕' });

    const call = hass.calls.callService[0];
    assert.equal(call.domain, 'lucarne_family');
    assert.equal(call.service, 'update_task_metadata');
    assert.equal(call.payload.uid, 'uid-abc');
    assert.equal(call.payload.type, 'chore');
    assert.equal(call.payload.icon, '🐕');
    assert.equal(call.payload.recurrence, undefined);
  });

  it('only sends fields that are provided', async () => {
    const hass = makeHass();
    await updateTaskMetadata(hass, 'uid-xyz', { recurrence: 'FREQ=DAILY' });

    const call = hass.calls.callService[0];
    assert.equal(call.payload.recurrence, 'FREQ=DAILY');
    assert.ok(!('type' in call.payload), 'type not sent when not provided');
    assert.ok(!('icon' in call.payload), 'icon not sent when not provided');
  });

  it('sends rotation_owners and current_owner when provided', async () => {
    const hass = makeHass();
    await updateTaskMetadata(hass, 'uid-rot', {
      rotation_owners: ['alice', 'cara'],
      current_owner: 'alice',
    });

    const call = hass.calls.callService[0];
    assert.deepEqual(call.payload.rotation_owners, ['alice', 'cara']);
    assert.equal(call.payload.current_owner, 'alice');
  });
});

describe('deleteTask', () => {
  it('calls lucarne_family.delete_task with uid', async () => {
    const hass = makeHass();
    await deleteTask(hass, 'uid-del');

    const call = hass.calls.callService[0];
    assert.equal(call.domain, 'lucarne_family');
    assert.equal(call.service, 'delete_task');
    assert.equal(call.payload.uid, 'uid-del');
  });
});

describe('uploadAvatar', () => {
  it('calls lucarne_family.upload_avatar with base64 image_data and mime_type', async () => {
    const hass = makeHass();

    // Create a minimal 1x1 PNG file-like object
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const file = new File([pngBytes], 'avatar.png', { type: 'image/png' });

    await uploadAvatar(hass, 'anna', file);

    const call = hass.calls.callService[0];
    assert.equal(call.domain, 'lucarne_family');
    assert.equal(call.service, 'upload_avatar');
    assert.equal(call.payload.member, 'anna');
    assert.equal(call.payload.mime_type, 'image/png');
    assert.ok(typeof call.payload.image_data === 'string', 'image_data is a base64 string');
    assert.ok((call.payload.image_data as string).length > 0);
    // Verify it doesn't use 'mime' (wrong field name)
    assert.ok(!('mime' in call.payload), 'field must be mime_type, not mime');
  });
});
