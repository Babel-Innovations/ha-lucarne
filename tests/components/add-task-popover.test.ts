import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneAddTaskPopover } from '../../src/components/add-task-popover.js';
import type { MemberSummary, HomeAssistant } from '../../src/shared/types.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';

await import('../../src/components/add-task-popover.js');

const MEMBER_ANNA: MemberSummary = {
  slug: 'anna',
  name: 'Anna',
  color: '#f5c89c',
  avatar: null,
  todo_entity_id: 'todo.anna',
  streak_counter_id: 'counter.anna_streak',
};

const MEMBER_BOB: MemberSummary = {
  slug: 'bob',
  name: 'Bob',
  color: '#b8e0d2',
  avatar: null,
  todo_entity_id: 'todo.bob',
  streak_counter_id: 'counter.bob_streak',
};

const HOUSEHOLD: MemberSummary = {
  slug: 'household',
  name: 'Household',
  color: 'var(--primary-color)',
  avatar: null,
  todo_entity_id: 'todo.lucarne_household',
  streak_counter_id: '',
};

function makeEl(member = MEMBER_ANNA, members = [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]): LucarneAddTaskPopover {
  const el = document.createElement('lucarne-add-task-popover') as LucarneAddTaskPopover;
  el.hass = makeFakeHass() as unknown as HomeAssistant;
  el.member = member;
  el.members = members;
  document.body.appendChild(el);
  return el;
}

function shadow(el: LucarneAddTaskPopover, sel: string) {
  return el.shadowRoot?.querySelector(sel) ?? null;
}

afterEach(() => {
  document.querySelectorAll('lucarne-add-task-popover').forEach((el) => el.remove());
});

describe('lucarne-add-task-popover', () => {
  it('renders the Add Task popover', async () => {
    const el = makeEl();
    await el.updateComplete;

    const title = shadow(el, '.popover-title');
    assert.ok(title, 'popover-title rendered');
    assert.equal(title!.textContent, 'Add Task');
  });

  it('calls lucarne_family.add_task on submit with correct payload', async () => {
    const el = makeEl();
    await el.updateComplete;

    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Brush teeth';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));

    // Select Routine type via the Type <select>
    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    assert.ok(typeSelect, 'Type select renders');
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const submitBtn = shadow(el, '.btn-submit') as HTMLButtonElement;
    submitBtn.click();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(fakeHass.calls.callService.length, 1);
    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.domain, 'lucarne_family');
    assert.equal(call.service, 'add_task');
    assert.equal(call.payload.member, 'anna');
    assert.equal(call.payload.summary, 'Brush teeth');
    assert.equal(call.payload.type, 'routine');
  });

  it('shows error when summary is empty', async () => {
    const el = makeEl();
    await el.updateComplete;

    const submitBtn = shadow(el, '.btn-submit') as HTMLButtonElement;
    submitBtn.click();
    await el.updateComplete;

    const errorMsg = shadow(el, '.error-msg');
    assert.ok(errorMsg, 'error message shown');
    assert.ok(errorMsg!.textContent!.toLowerCase().includes('required'));
  });

  it('fires popover-close on Cancel click', async () => {
    const el = makeEl();
    await el.updateComplete;

    const events: Event[] = [];
    el.addEventListener('popover-close', (e) => events.push(e));

    const cancelBtn = shadow(el, '.btn-cancel') as HTMLButtonElement;
    cancelBtn.click();

    assert.equal(events.length, 1);
  });

  it('fires popover-close on backdrop click', async () => {
    const el = makeEl();
    await el.updateComplete;

    const events: Event[] = [];
    el.addEventListener('popover-close', (e) => events.push(e));

    const backdrop = shadow(el, '.backdrop') as HTMLElement;
    backdrop.click();

    assert.equal(events.length, 1);
  });

  it('renders no Assignee field, even for household tasks', async () => {
    const el = makeEl(HOUSEHOLD);
    await el.updateComplete;

    assert.equal(shadow(el, '#at-assignee'), null, 'assignee select is gone');
    const labels = Array.from(el.shadowRoot!.querySelectorAll('label')).map(
      (l) => l.textContent?.trim() ?? '',
    );
    assert.ok(
      !labels.some((t) => t.toLowerCase().startsWith('assignee')),
      `no Assignee label (found: ${labels.join(', ')})`,
    );
  });

  it('omits assignee from add_task payload for household tasks', async () => {
    const el = makeEl(HOUSEHOLD);
    await el.updateComplete;

    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Feed dog';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    const submitBtn = shadow(el, '.btn-submit') as HTMLButtonElement;
    submitBtn.click();
    await new Promise((r) => setTimeout(r, 50));

    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.payload.member, 'household');
    assert.ok(!('assignee' in call.payload), 'assignee never sent from Add Task');
  });

  it('omits assignee from add_task payload for non-household tasks', async () => {
    const el = makeEl(MEMBER_ANNA);
    await el.updateComplete;

    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Make bed';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    const submitBtn = shadow(el, '.btn-submit') as HTMLButtonElement;
    submitBtn.click();
    await new Promise((r) => setTimeout(r, 50));

    const call = fakeHass.calls.callService[0] as any;
    assert.ok(!('assignee' in call.payload), 'assignee not sent for non-household member');
  });

  it('renders Type as a <select> with Routine, Chore, and Rotating options', async () => {
    const el = makeEl();
    await el.updateComplete;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    assert.ok(typeSelect, 'Type select exists');
    const values = Array.from(typeSelect.options).map((o) => o.value).sort();
    assert.deepEqual(values, ['chore', 'rotating', 'routine']);
    assert.equal(shadow(el, '.type-btn'), null, 'old type buttons removed');
  });

  it('hides Recurrence when type is chore (default)', async () => {
    const el = makeEl();
    await el.updateComplete;

    assert.equal(shadow(el, '#at-recurrence'), null, 'recurrence select hidden for chore');
  });

  it('shows Recurrence when type switched to routine', async () => {
    const el = makeEl();
    await el.updateComplete;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    assert.ok(shadow(el, '#at-recurrence'), 'recurrence select shown for routine');
  });

  it('allows chore submit after picking Routine+Weekly with no days, then switching to Chore', async () => {
    const el = makeEl();
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    // Routine + Weekly (no days picked) → would fail validation if guard isn't type-scoped.
    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const recurSelect = shadow(el, '#at-recurrence') as HTMLSelectElement;
    recurSelect.value = 'weekly';
    recurSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    // Switch back to Chore — recurrence picker is now hidden, but state lingers.
    typeSelect.value = 'chore';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Mow lawn';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(shadow(el, '.error-msg'), null, 'no validation error for chore');
    assert.equal(fakeHass.calls.callService.length, 1, 'add_task was called');
    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.payload.type, 'chore');
    assert.ok(!('recurrence' in call.payload), 'chore payload has no recurrence');
  });

  it('omits due from payload for routine even if a due date was picked as a chore', async () => {
    const el = makeEl();
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    // Default is chore — pick a due date (UI shows the datetime-local for chores).
    const dueInput = shadow(el, '#at-due') as HTMLInputElement;
    assert.ok(dueInput, 'Due input visible for chore');
    dueInput.value = '2099-01-15T08:30';
    dueInput.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    // Switch to routine — Due field becomes hidden but _due state lingers.
    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;
    assert.equal(shadow(el, '#at-due'), null, 'Due input hidden for routine');

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Brush teeth';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));

    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.payload.type, 'routine');
    assert.ok(!('due' in call.payload), `routine must not carry due (got ${JSON.stringify(call.payload)})`);
  });

  it('exposes the time_of_day dropdown for both routine and chore', async () => {
    const el = makeEl();
    await el.updateComplete;

    // Default type is chore — picker must still be visible.
    let todSelect = shadow(el, '#at-time-of-day') as HTMLSelectElement | null;
    assert.ok(todSelect, 'time_of_day select visible for chore');
    const optionValues = Array.from(todSelect!.options).map((o) => o.value);
    assert.deepEqual(optionValues, ['anytime', 'morning', 'afternoon', 'night']);

    // Switch to routine — picker still visible.
    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;
    todSelect = shadow(el, '#at-time-of-day') as HTMLSelectElement | null;
    assert.ok(todSelect, 'time_of_day select still visible for routine');
  });

  it('sends the picked time_of_day in the add_task payload', async () => {
    const el = makeEl();
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Brush teeth';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const todSelect = shadow(el, '#at-time-of-day') as HTMLSelectElement;
    todSelect.value = 'morning';
    todSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));

    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.payload.time_of_day, 'morning');
  });

  it('defaults time_of_day to anytime in the add_task payload', async () => {
    const el = makeEl();
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Quick chore';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));

    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.payload.time_of_day, 'anytime');
  });

  // ---------- multi-member "Also add to" checklist ----------

  it('does not render "Also add to" checklist when type is chore (default)', async () => {
    const el = makeEl();
    await el.updateComplete;

    // Chore is default — checklist must be absent.
    const labels = Array.from(el.shadowRoot!.querySelectorAll('label')).map((l) => l.textContent?.trim() ?? '');
    assert.ok(
      !labels.some((t) => t.toLowerCase().startsWith('also add')),
      `"Also add to" label must not appear for chore (found: ${labels.join(', ')})`,
    );
    assert.equal(el.shadowRoot!.querySelector('.also-add-list'), null, 'no .also-add-list for chore');
  });

  it('renders "Also add to" checklist when type is routine, excluding current member and household', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const list = el.shadowRoot!.querySelector('.also-add-list');
    assert.ok(list, '.also-add-list rendered for routine');

    // Only Bob should appear (Anna is the current member; Household excluded).
    const items = Array.from(list!.querySelectorAll('.also-add-item'));
    assert.equal(items.length, 1, 'exactly one other non-household member offered');
    assert.ok(items[0].textContent?.includes('Bob'), 'Bob appears as option');
    assert.ok(!items[0].textContent?.includes('Anna'), 'Anna does not appear');
    assert.ok(!items[0].textContent?.includes('Household'), 'Household does not appear');
  });

  it('submitting with 2 extra members ticked issues 3 add_task calls', async () => {
    const MEMBER_CARA: MemberSummary = {
      slug: 'cara',
      name: 'Cara',
      color: '#aabbcc',
      avatar: null,
      todo_entity_id: 'todo.cara',
      streak_counter_id: 'counter.cara_streak',
    };
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, MEMBER_CARA, HOUSEHOLD]);
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    // Switch to routine.
    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    // Tick Bob and Cara.
    const checkboxes = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLInputElement>('.also-add-item input[type="checkbox"]'),
    );
    assert.equal(checkboxes.length, 2, 'two extra members offered');
    for (const cb of checkboxes) {
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await el.updateComplete;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Brush teeth';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(fakeHass.calls.callService.length, 3, 'exactly 3 add_task calls issued');
    const slugs = (fakeHass.calls.callService as any[]).map((c) => c.payload.member);
    assert.ok(slugs.includes('anna'), 'anna call issued');
    assert.ok(slugs.includes('bob'), 'bob call issued');
    assert.ok(slugs.includes('cara'), 'cara call issued');

    // All calls use type: routine with identical summary.
    for (const call of fakeHass.calls.callService as any[]) {
      assert.equal(call.domain, 'lucarne_family');
      assert.equal(call.service, 'add_task');
      assert.equal(call.payload.type, 'routine');
      assert.equal(call.payload.summary, 'Brush teeth');
    }
  });

  it('submitting with no extra members ticked issues exactly 1 add_task call', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Make bed';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(fakeHass.calls.callService.length, 1, 'only 1 add_task call when no extras ticked');
    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.payload.member, 'anna');
  });

  it('switching type from routine to chore clears ticked "also add to" selection', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    // Switch to routine and tick Bob.
    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const cb = el.shadowRoot!.querySelector<HTMLInputElement>('.also-add-item input[type="checkbox"]')!;
    assert.ok(cb, 'checkbox found');
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    // Switch back to chore — selection must be cleared and checklist hidden.
    typeSelect.value = 'chore';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    assert.equal(el.shadowRoot!.querySelector('.also-add-list'), null, 'checklist hidden for chore');

    // Now switch back to routine — checklist re-renders with nothing ticked.
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const cbAfter = el.shadowRoot!.querySelector<HTMLInputElement>('.also-add-item input[type="checkbox"]')!;
    assert.ok(cbAfter, 'checkbox re-renders');
    assert.equal(cbAfter.checked, false, 'checkbox is unchecked after type round-trip');

    // Submit without ticking anything — should be 1 call, not 2.
    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Test task';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(fakeHass.calls.callService.length, 1, 'only 1 add_task call after stale tick cleared');
  });

  it('keeps popover open and shows error when add_task call rejects', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;

    // Make callService reject.
    (el.hass as any).callService = async () => {
      throw new Error('HA service failed');
    };

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Brush teeth';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    const closedEvents: Event[] = [];
    el.addEventListener('popover-close', (e) => closedEvents.push(e));

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(closedEvents.length, 0, 'popover must NOT close on error');
    const errorMsg = shadow(el, '.error-msg');
    assert.ok(errorMsg, 'error message shown');
    assert.ok(errorMsg!.textContent!.includes('HA service failed'), 'error text displayed');
    assert.equal((shadow(el, '.btn-submit') as HTMLButtonElement).disabled, false, 'submit re-enabled after error');
  });

  // ---------- rotating type ----------

  it('selecting rotating hides recurrence and due, shows owners picker', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'rotating';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    assert.equal(shadow(el, '#at-recurrence'), null, 'recurrence hidden for rotating');
    assert.equal(shadow(el, '#at-due'), null, 'due hidden for rotating');
    assert.ok(el.shadowRoot!.querySelector('.owners-list'), 'owners-list shown for rotating');
  });

  it('submit is disabled with <2 owners for rotating', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'rotating';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Clean bathroom';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    // No owners selected yet
    const submitBtn = shadow(el, '.btn-submit') as HTMLButtonElement;
    assert.equal(submitBtn.disabled, true, 'submit disabled with 0 owners');

    // Select only one owner
    const checkboxes = Array.from(el.shadowRoot!.querySelectorAll<HTMLInputElement>('.owner-item input[type="checkbox"]'));
    assert.ok(checkboxes.length >= 1, 'owner checkboxes rendered');
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    assert.equal((shadow(el, '.btn-submit') as HTMLButtonElement).disabled, true, 'submit still disabled with 1 owner');
  });

  it('submitting rotating task with 2 owners issues 1 add_task call with correct payload', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'rotating';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Clean bathroom';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    // Check both members (Anna and Bob)
    const checkboxes = Array.from(el.shadowRoot!.querySelectorAll<HTMLInputElement>('.owner-item input[type="checkbox"]'));
    assert.equal(checkboxes.length, 2, 'two non-household members shown');
    for (const cb of checkboxes) {
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await el.updateComplete;

    const submitBtn = shadow(el, '.btn-submit') as HTMLButtonElement;
    assert.equal(submitBtn.disabled, false, 'submit enabled with 2 owners');

    submitBtn.click();
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(fakeHass.calls.callService.length, 1, 'exactly 1 add_task call');
    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.domain, 'lucarne_family');
    assert.equal(call.service, 'add_task');
    assert.equal(call.payload.member, 'household');
    assert.equal(call.payload.type, 'rotating');
    assert.ok(Array.isArray(call.payload.rotation_owners), 'rotation_owners sent');
    assert.equal(call.payload.rotation_owners.length, 2);
    assert.ok(!('recurrence' in call.payload), 'no recurrence for rotating');
  });

  it('reorder changes the emitted rotation_owners order', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'rotating';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    // Check Anna then Bob
    const checkboxes = Array.from(el.shadowRoot!.querySelectorAll<HTMLInputElement>('.owner-item input[type="checkbox"]'));
    for (const cb of checkboxes) {
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await el.updateComplete;

    // Move Bob up (Bob was added second, so is at index 1; click his "up" button)
    const upBtns = Array.from(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.reorder-btn'));
    // The up buttons that are not disabled are for items at index > 0
    const enabledUp = upBtns.filter((b) => !b.disabled && b.getAttribute('aria-label')?.includes('earlier'));
    assert.ok(enabledUp.length >= 1, 'at least one enabled up button');
    enabledUp[0].click();
    await el.updateComplete;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Clean bathroom';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));

    const call = fakeHass.calls.callService[0] as any;
    // After moving Bob up, Bob should be first
    assert.equal(call.payload.rotation_owners[0], 'bob', 'Bob moved to first after up click');
    assert.equal(call.payload.rotation_owners[1], 'anna', 'Anna is second after Bob moved up');
  });

  it('"Also add to" checklist is not shown for rotating type', async () => {
    const el = makeEl(MEMBER_ANNA, [MEMBER_ANNA, MEMBER_BOB, HOUSEHOLD]);
    await el.updateComplete;

    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'rotating';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    assert.equal(el.shadowRoot!.querySelector('.also-add-list'), null, 'no also-add-list for rotating');
    const labels = Array.from(el.shadowRoot!.querySelectorAll('label')).map((l) => l.textContent?.trim() ?? '');
    assert.ok(!labels.some((t) => t.toLowerCase().startsWith('also add')), 'no "Also add to" label for rotating');
  });

  it('omits recurrence from payload for chore even if RRULE state lingers', async () => {
    const el = makeEl();
    await el.updateComplete;
    const fakeHass = el.hass as unknown as ReturnType<typeof makeFakeHass>;

    // Simulate the user picking Routine + Daily, then flipping back to Chore.
    const typeSelect = shadow(el, '#at-type') as HTMLSelectElement;
    typeSelect.value = 'routine';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const recurSelect = shadow(el, '#at-recurrence') as HTMLSelectElement;
    recurSelect.value = 'daily';
    recurSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    typeSelect.value = 'chore';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    const summaryInput = shadow(el, '#at-summary') as HTMLInputElement;
    summaryInput.value = 'Clean garage';
    summaryInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await el.updateComplete;

    (shadow(el, '.btn-submit') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));

    const call = fakeHass.calls.callService[0] as any;
    assert.equal(call.payload.type, 'chore');
    assert.ok(!('recurrence' in call.payload), `chore must not carry recurrence (got ${JSON.stringify(call.payload)})`);
  });
});
