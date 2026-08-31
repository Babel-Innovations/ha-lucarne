import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { LucarneCalendarEventPopover } from '../../src/components/calendar-event-popover.js';
import type { HomeAssistant, CalendarEvent } from '../../src/shared/types.js';

await import('../../src/components/calendar-event-popover.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    start: '2026-05-25T14:00:00',
    end: '2026-05-25T15:00:00',
    summary: 'Test event',
    uid: 'calendar.family::abc-123',
    ...overrides,
  };
}

function makeHass(supportedFeatures: number | undefined): HomeAssistant {
  return {
    states: {
      'calendar.family': {
        attributes: {
          ...(supportedFeatures !== undefined ? { supported_features: supportedFeatures } : {}),
        },
      },
    },
    callService: async () => {},
    connection: {
      sendMessagePromise: async () => undefined,
    },
  } as unknown as HomeAssistant;
}

function makeEl(
  opts: {
    event?: CalendarEvent | null;
    entityId?: string;
    hass?: HomeAssistant;
  } = {},
): LucarneCalendarEventPopover {
  const el = document.createElement('lucarne-calendar-event-popover') as LucarneCalendarEventPopover;
  el.event = opts.event !== undefined ? opts.event : makeEvent();
  el.entityId = opts.entityId !== undefined ? opts.entityId : 'calendar.family';
  el.hass = opts.hass !== undefined ? opts.hass : makeHass(3); // bits 1+2 set → supports CREATE+DELETE
  document.body.appendChild(el);
  return el;
}

function shadowQuery(el: LucarneCalendarEventPopover, selector: string): Element | null {
  return el.shadowRoot?.querySelector(selector) ?? null;
}

function shadowQueryAll(el: LucarneCalendarEventPopover, selector: string): Element[] {
  return Array.from(el.shadowRoot?.querySelectorAll(selector) ?? []);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Selector helpers. The delete affordance is an icon button in the header with
// aria-label "Delete event" (initial) or "Confirm delete" (armed). The Cancel
// affordance is a `.cancel-link` inside the `.confirm-pill` that appears once
// the trash is armed.
const DELETE_BTN = 'button[aria-label="Delete event"]';
const CONFIRM_BTN = 'button[aria-label="Confirm delete"]';
const CANCEL_LINK = '.confirm-pill .cancel-link';

describe('LucarneCalendarEventPopover — Delete button visibility', () => {
  let el: LucarneCalendarEventPopover;

  afterEach(() => el?.remove());

  it('renders trash button when entity supports delete and event is non-recurring', async () => {
    el = makeEl({ hass: makeHass(3) }); // bits 1+2 set: CREATE+DELETE
    await el.updateComplete;
    const btn = shadowQuery(el, DELETE_BTN);
    assert.ok(btn, 'Trash button should be rendered');
    assert.match(btn!.textContent ?? '', /🗑/);
  });

  it('does NOT render trash button when entity does not support delete', async () => {
    el = makeEl({ hass: makeHass(5) }); // bits 1+4: CREATE+UPDATE, no DELETE
    await el.updateComplete;
    assert.equal(shadowQuery(el, DELETE_BTN), null);
  });

  it('does NOT render trash button when supported_features is missing', async () => {
    el = makeEl({ hass: makeHass(undefined) });
    await el.updateComplete;
    assert.equal(shadowQuery(el, DELETE_BTN), null);
  });

  // For the sad-path tests below, supported_features is set to 3 (CREATE+DELETE)
  // so the only thing blocking the trash button is the named guard
  // (entityId / uid / rrule / recurrence_id). The render gate is a logical AND:
  // any one of these guards is enough to hide the button.

  it('does NOT render trash button when entityId is empty', async () => {
    el = makeEl({ entityId: '', hass: makeHass(3) });
    await el.updateComplete;
    assert.equal(shadowQuery(el, DELETE_BTN), null);
  });

  it('does NOT render trash button when event has no uid', async () => {
    el = makeEl({ event: makeEvent({ uid: undefined }), hass: makeHass(3) });
    await el.updateComplete;
    assert.equal(shadowQuery(el, DELETE_BTN), null);
  });

  it('does NOT render trash button when event has rrule (recurring)', async () => {
    el = makeEl({ event: makeEvent({ rrule: 'FREQ=WEEKLY' }), hass: makeHass(3) });
    await el.updateComplete;
    assert.equal(shadowQuery(el, DELETE_BTN), null);
  });

  it('does NOT render trash button when event has recurrence_id (recurring instance)', async () => {
    el = makeEl({ event: makeEvent({ recurrence_id: '2026-05-25T14:00:00' }), hass: makeHass(3) });
    await el.updateComplete;
    assert.equal(shadowQuery(el, DELETE_BTN), null);
  });
});

describe('LucarneCalendarEventPopover — Delete confirm flow', () => {
  let el: LucarneCalendarEventPopover;

  afterEach(() => el?.remove());

  it('first trash tap arms confirm: trash relabels + Cancel pill appears', async () => {
    el = makeEl({ hass: makeHass(3) });
    await el.updateComplete;

    (shadowQuery(el, DELETE_BTN) as HTMLButtonElement).click();
    await el.updateComplete;

    const confirmBtn = shadowQuery(el, CONFIRM_BTN) as HTMLButtonElement;
    const cancelBtn = shadowQuery(el, CANCEL_LINK) as HTMLButtonElement;
    assert.ok(confirmBtn, 'trash should relabel to "Confirm delete"');
    assert.ok(cancelBtn, 'Cancel link should be present in confirm pill');
    assert.equal(cancelBtn.textContent?.trim(), 'Cancel');
    // Trash button should pick up the `armed` class for visual feedback.
    assert.ok(confirmBtn.classList.contains('armed'), 'trash should have .armed class');
  });

  it('Cancel tap returns to non-confirm state', async () => {
    el = makeEl({ hass: makeHass(3) });
    await el.updateComplete;

    (shadowQuery(el, DELETE_BTN) as HTMLButtonElement).click();
    await el.updateComplete;

    (shadowQuery(el, CANCEL_LINK) as HTMLButtonElement).click();
    await el.updateComplete;

    const deleteBtn = shadowQuery(el, DELETE_BTN) as HTMLButtonElement;
    assert.ok(deleteBtn, 'Delete button should be back');
    assert.equal(shadowQuery(el, CANCEL_LINK), null);
    assert.equal(shadowQuery(el, '.confirm-pill'), null);
  });

  it('second trash tap (Confirm delete) dispatches lucarne-event-deleted with entityId and uid', async () => {
    const events: CustomEvent[] = [];
    el = makeEl({ hass: makeHass(3) });
    el.addEventListener('lucarne-event-deleted', (e) => events.push(e as CustomEvent));
    await el.updateComplete;

    (shadowQuery(el, DELETE_BTN) as HTMLButtonElement).click();
    await el.updateComplete;
    (shadowQuery(el, CONFIRM_BTN) as HTMLButtonElement).click();
    await el.updateComplete;
    // Wait for async _confirmDelete to complete
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(events.length, 1);
    assert.equal(events[0].detail.entityId, 'calendar.family');
    assert.equal(events[0].detail.uid, 'calendar.family::abc-123');
  });

  it('strips entityId:: prefix before sending the calendar/event/delete WS command', async () => {
    const msgs: Array<Record<string, unknown>> = [];
    const hass = makeHass(3);
    (hass as unknown as { connection: { sendMessagePromise: (m: Record<string, unknown>) => Promise<unknown> } })
      .connection.sendMessagePromise = async (m) => { msgs.push(m); return undefined; };

    el = makeEl({ hass });
    await el.updateComplete;

    (shadowQuery(el, DELETE_BTN) as HTMLButtonElement).click();
    await el.updateComplete;
    (shadowQuery(el, CONFIRM_BTN) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].type, 'calendar/event/delete');
    assert.equal(msgs[0].entity_id, 'calendar.family');
    assert.equal(msgs[0].uid, 'abc-123', 'entityId:: prefix stripped before delete');
  });
});

describe('LucarneCalendarEventPopover — Delete error path', () => {
  let el: LucarneCalendarEventPopover;

  afterEach(() => el?.remove());

  it('shows inline error-msg when deleteCalendarEvent rejects; popover stays open; no event dispatched', async () => {
    const events: CustomEvent[] = [];
    const hass = makeHass(3);
    (hass as unknown as { connection: { sendMessagePromise: () => Promise<unknown> } })
      // `sendMessagePromise` rejects with the server's plain `{ code, message }`
      // payload, not an Error — rejecting with an Error here is what hid #128.
      .connection.sendMessagePromise = async () => { throw { code: 'unknown_error', message: 'uid not found' }; };
    el = makeEl({ hass });
    el.addEventListener('lucarne-event-deleted', (e) => events.push(e as CustomEvent));
    await el.updateComplete;

    (shadowQuery(el, DELETE_BTN) as HTMLButtonElement).click();
    await el.updateComplete;
    (shadowQuery(el, CONFIRM_BTN) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 10));
    await el.updateComplete;

    const errEl = shadowQuery(el, '.error-msg');
    assert.ok(errEl, 'error-msg element should be rendered');
    assert.match(errEl!.textContent ?? '', /uid not found/);
    assert.equal(events.length, 0, 'lucarne-event-deleted must not be dispatched');
    // Popover is still open (still has .popover in shadow DOM)
    assert.ok(shadowQuery(el, '.popover'), 'popover should still be open');
  });

  it('error is cleared when trash is tapped again after an error', async () => {
    let fail = true;
    const hass = makeHass(3);
    (hass as unknown as { connection: { sendMessagePromise: () => Promise<unknown> } })
      .connection.sendMessagePromise = async () => {
        if (fail) throw { code: 'unknown_error', message: 'boom' };
        return undefined;
      };
    el = makeEl({ hass });
    await el.updateComplete;

    // First attempt — fails
    (shadowQuery(el, DELETE_BTN) as HTMLButtonElement).click();
    await el.updateComplete;
    (shadowQuery(el, CONFIRM_BTN) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 10));
    await el.updateComplete;
    assert.ok(shadowQuery(el, '.error-msg'), 'error should appear');

    // Tap trash again to start a new attempt
    fail = false;
    (shadowQuery(el, DELETE_BTN) as HTMLButtonElement).click();
    await el.updateComplete;
    assert.equal(shadowQuery(el, '.error-msg'), null, 'error should be cleared on new attempt');
  });
});

describe('LucarneCalendarEventPopover — header layout', () => {
  let el: LucarneCalendarEventPopover;

  afterEach(() => el?.remove());

  it('header places title between color dot and the icon buttons', async () => {
    el = makeEl({ hass: makeHass(3) });
    await el.updateComplete;

    const header = shadowQuery(el, '.popover-header') as HTMLElement;
    assert.ok(header, 'popover-header should be present');
    const children = Array.from(header.children) as HTMLElement[];
    // Expect: [color-dot, event-title, trash icon-btn, close icon-btn]
    assert.equal(children.length, 4, 'header should have 4 grid cells');
    assert.ok(children[0].classList.contains('color-dot'));
    assert.ok(children[1].classList.contains('event-title'));
    assert.equal(children[2].getAttribute('aria-label'), 'Delete event');
    assert.equal(children[3].getAttribute('aria-label'), 'Close');
  });

  it('keeps Close button as rightmost cell even when trash is hidden (no delete support)', async () => {
    el = makeEl({ hass: makeHass(undefined) });
    await el.updateComplete;

    const header = shadowQuery(el, '.popover-header') as HTMLElement;
    const children = Array.from(header.children) as HTMLElement[];
    // Header still has 4 cells; the trash slot is an empty placeholder span
    // so the grid keeps its `auto 1fr auto auto` shape and the Close button
    // stays anchored to the right edge.
    assert.equal(children.length, 4);
    const close = children[3] as HTMLButtonElement;
    assert.equal(close.getAttribute('aria-label'), 'Close');
  });
});

describe('LucarneCalendarEventPopover — no event', () => {
  let el: LucarneCalendarEventPopover;

  afterEach(() => el?.remove());

  it('renders nothing when event is null', async () => {
    el = makeEl({ event: null });
    await el.updateComplete;
    assert.equal(shadowQueryAll(el, '*').length, 0);
  });
});
