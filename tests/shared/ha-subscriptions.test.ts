import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchCalendarEvents,
  deleteCalendarEvent,
  entitySupportsDelete,
  subscribeEntityStates,
  subscribeTodoItems,
} from '../../src/shared/ha-subscriptions.js';
import type { HomeAssistant } from '../../src/shared/types.js';
import { makeFakeHass } from '../setup/ha-mock.mjs';
import type { FakeHass } from '../setup/ha-mock.mjs';

// Raw event shape returned by HA's REST endpoint /api/calendars/<entity_id>.
// Matches Google-Calendar-v3-style nesting for start/end.
type RawEvent = {
  start: string | { dateTime?: string; date?: string };
  end: string | { dateTime?: string; date?: string };
  summary?: string;
  description?: string;
  location?: string;
  uid?: string;
  recurrence_id?: string | null;
  rrule?: string | null;
};

type ApiCallRecord = { method: string; path: string };
type ApiResult = RawEvent[] | Error;

function makeHass(handler: (path: string) => Promise<ApiResult>): {
  hass: HomeAssistant;
  calls: ApiCallRecord[];
} {
  const base: FakeHass = makeFakeHass();
  const calls: ApiCallRecord[] = [];
  base.callApi = async (method: string, path: string) => {
    calls.push({ method, path });
    const result = await handler(path);
    if (result instanceof Error) throw result;
    return result;
  };
  return { hass: base as unknown as HomeAssistant, calls };
}

const START = new Date('2026-05-18T00:00:00Z');
const END = new Date('2026-05-25T00:00:00Z');

describe('fetchCalendarEvents', () => {
  // Restore console.warn in afterEach so an assertion that throws mid-test
  // can't leak the stub into later tests (in this file or sibling files).
  let warnCalls: unknown[][];
  const originalWarn = console.warn;
  beforeEach(() => {
    warnCalls = [];
    console.warn = (...args: unknown[]) => warnCalls.push(args);
  });
  afterEach(() => {
    console.warn = originalWarn;
  });

  it('calls GET /api/calendars/<entity>?start=...&end=... with URL-encoded ISO times', async () => {
    const { hass, calls } = makeHass(async () => []);
    await fetchCalendarEvents(hass, ['calendar.family'], START, END);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'GET');
    assert.match(calls[0].path, /^calendars\/calendar\.family\?start=.+&end=.+$/);
    // URL-encoded ISO strings: ':' → '%3A'
    assert.ok(calls[0].path.includes(encodeURIComponent(START.toISOString())));
    assert.ok(calls[0].path.includes(encodeURIComponent(END.toISOString())));
  });

  it('normalises nested {dateTime} shape to flat string + preserves uid for timed events', async () => {
    const peloton: RawEvent = {
      start: { dateTime: '2026-05-22T09:00:00-07:00' },
      end: { dateTime: '2026-05-22T10:00:00-07:00' },
      summary: 'Peloton',
      uid: 'peloton-uid-123@google.com',
    };
    const { hass } = makeHass(async () => [peloton]);
    const result = await fetchCalendarEvents(hass, ['calendar.ingrid'], START, END);

    const events = result.events.get('calendar.ingrid')!;
    assert.equal(events.length, 1);
    assert.equal(events[0].start, '2026-05-22T09:00:00-07:00');
    assert.equal(events[0].end, '2026-05-22T10:00:00-07:00');
    assert.equal(events[0].summary, 'Peloton');
    assert.equal(events[0].uid, 'peloton-uid-123@google.com', 'uid is preserved end-to-end (the whole point of the REST switch)');
    assert.equal(result.failed.size, 0);
  });

  it('normalises nested {date} shape (all-day events) to flat YYYY-MM-DD string', async () => {
    const birthday: RawEvent = {
      start: { date: '2026-05-25' },
      end: { date: '2026-05-26' },
      summary: 'Birthday',
      uid: 'bday@local',
    };
    const { hass } = makeHass(async () => [birthday]);
    const result = await fetchCalendarEvents(hass, ['calendar.family'], START, END);

    const events = result.events.get('calendar.family')!;
    assert.equal(events[0].start, '2026-05-25');
    assert.equal(events[0].end, '2026-05-26');
  });

  it('accepts flat-string start/end (forward-compat with integrations that already flatten)', async () => {
    const raw: RawEvent = {
      start: '2026-05-22T09:00:00-07:00',
      end: '2026-05-22T10:00:00-07:00',
      summary: 'Flat',
    };
    const { hass } = makeHass(async () => [raw]);
    const result = await fetchCalendarEvents(hass, ['calendar.x'], START, END);
    const e = result.events.get('calendar.x')![0];
    assert.equal(e.start, '2026-05-22T09:00:00-07:00');
    assert.equal(e.end, '2026-05-22T10:00:00-07:00');
  });

  it('preserves recurrence_id and rrule when present; converts null to undefined', async () => {
    const recurring: RawEvent = {
      start: { dateTime: '2026-05-22T09:00:00Z' },
      end: { dateTime: '2026-05-22T10:00:00Z' },
      summary: 'Weekly',
      uid: 'r1',
      rrule: 'FREQ=WEEKLY',
      recurrence_id: null,
    };
    const { hass } = makeHass(async () => [recurring]);
    const events = (await fetchCalendarEvents(hass, ['calendar.x'], START, END)).events.get('calendar.x')!;
    assert.equal(events[0].rrule, 'FREQ=WEEKLY');
    assert.equal(events[0].recurrence_id, undefined, 'null becomes undefined');
  });

  it('returns empty array (no throw) when the REST call rejects, and logs + tracks the entity', async () => {
    const { hass } = makeHass(async () => new Error('boom'));
    const result = await fetchCalendarEvents(hass, ['calendar.broken'], START, END);

    assert.deepEqual(result.events.get('calendar.broken'), []);
    assert.ok(result.failed.has('calendar.broken'), 'failed entity tracked in result.failed');
    assert.equal(warnCalls.length, 1);
    assert.match(String(warnCalls[0][0]), /\/api\/calendars\/calendar\.broken failed/);
  });

  it('isolates per-entity failures — one rejection does not poison the batch', async () => {
    const okEvent: RawEvent = {
      start: { dateTime: '2026-05-22T09:00:00Z' },
      end: { dateTime: '2026-05-22T10:00:00Z' },
      summary: 'ok',
      uid: 'ok-uid',
    };
    const { hass } = makeHass(async (path) => {
      if (path.includes('calendar.bad')) return new Error('nope');
      return [okEvent];
    });
    const result = await fetchCalendarEvents(hass, ['calendar.ok', 'calendar.bad'], START, END);

    assert.equal(result.events.get('calendar.ok')?.length, 1);
    assert.deepEqual(result.events.get('calendar.bad'), []);
    assert.ok(result.failed.has('calendar.bad'), 'failed entity tracked');
    assert.equal(result.failed.has('calendar.ok'), false, 'successful entity NOT in failed set');
  });

  // Regression guard: an earlier version of this fetcher used
  // `hass.connection.sendMessagePromise({type: 'call_service', service:
  // 'calendar.get_events', return_response: true, ...})`. The service-call
  // response deliberately STRIPS uid from events, which broke delete (no uid
  // to address the event with). The fix is the REST endpoint
  // `/api/calendars/<entity>` — see commit `ae86d62f` and the JSDoc on
  // `fetchCalendarEvents`. This test fails if someone reverts the fetcher
  // to either the call_service WS path or the `callService` helper.
  it('regression: uses hass.callApi (REST), NOT callService or sendMessagePromise', async () => {
    let callApiCalls = 0;
    let sendMessageCalls = 0;
    let callServiceCalls = 0;
    const base: FakeHass = makeFakeHass();
    base.callApi = async () => { callApiCalls++; return []; };
    base.callService = async () => { callServiceCalls++; };
    base.connection.sendMessagePromise = async () => { sendMessageCalls++; return undefined; };
    await fetchCalendarEvents(base as unknown as HomeAssistant, ['calendar.family'], START, END);
    assert.equal(callApiCalls, 1, 'callApi must be the fetch path (REST endpoint returns uid)');
    assert.equal(sendMessageCalls, 0, 'sendMessagePromise must NOT be used — HA call_service strips uid');
    assert.equal(callServiceCalls, 0, 'callService must NOT be used for the same reason');
  });
});

describe('deleteCalendarEvent', () => {
  function makeDeleteHass(): {
    hass: HomeAssistant;
    msgs: Array<Record<string, unknown>>;
    rejectNext: boolean;
  } {
    const base: FakeHass = makeFakeHass();
    const msgs: Array<Record<string, unknown>> = [];
    let rejectNext = false;
    base.connection.sendMessagePromise = async (msg: unknown) => {
      msgs.push(msg as Record<string, unknown>);
      if (rejectNext) throw new Error('ws command failed');
    };
    return {
      hass: base as unknown as HomeAssistant,
      msgs,
      get rejectNext() { return rejectNext; },
      set rejectNext(v) { rejectNext = v; },
    };
  }

  it('sends calendar/event/delete WebSocket command with uid and entity_id', async () => {
    const { hass, msgs } = makeDeleteHass();
    await deleteCalendarEvent(hass, 'calendar.family', 'abc-123');

    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].type, 'calendar/event/delete');
    assert.equal(msgs[0].entity_id, 'calendar.family');
    assert.equal(msgs[0].uid, 'abc-123');
    assert.equal(msgs[0].recurrence_id, undefined, 'no recurrence_id by default');
    assert.equal(msgs[0].recurrence_range, undefined, 'no recurrence_range by default');
  });

  it('forwards optional recurrence_id and recurrence_range for recurring-event variants', async () => {
    const { hass, msgs } = makeDeleteHass();
    await deleteCalendarEvent(hass, 'calendar.family', 'abc-123', 'rec-1', 'THISANDFUTURE');

    assert.equal(msgs[0].recurrence_id, 'rec-1');
    assert.equal(msgs[0].recurrence_range, 'THISANDFUTURE');
  });

  it('rejects with the same error when the WS command rejects', async () => {
    const stub = makeDeleteHass();
    stub.rejectNext = true;
    await assert.rejects(
      () => deleteCalendarEvent(stub.hass, 'calendar.family', 'abc-123'),
      /ws command failed/,
    );
  });

  // Regression guard for the actual bug we shipped: an earlier version of this
  // helper called `hass.callService('calendar', 'delete_event', ...)`, but
  // `calendar.delete_event` is NOT a registered HA service (only
  // `calendar.create_event` and `calendar.get_events` exist — confirmed via
  // `ha_list_services`). HA's frontend deletes via the
  // `calendar/event/delete` WebSocket command. This test fails if someone
  // re-introduces the service-call path.
  it('regression: does NOT call hass.callService (HA has no calendar.delete_event service)', async () => {
    let callServiceCalls = 0;
    const base: FakeHass = makeFakeHass();
    base.callService = async () => { callServiceCalls++; };
    base.connection.sendMessagePromise = async () => undefined;
    await deleteCalendarEvent(base as unknown as HomeAssistant, 'calendar.family', 'abc-123');
    assert.equal(callServiceCalls, 0, 'callService must not be called — delete is a WS command');
  });
});

describe('entitySupportsDelete', () => {
  function makeStateHass(entityId: string, supportedFeatures: unknown): HomeAssistant {
    const base: FakeHass = makeFakeHass();
    // Cast through unknown to allow non-number values (e.g. 'yes') in negative test cases.
    base.states[entityId] = {
      attributes: { supported_features: supportedFeatures },
    } as unknown as import('home-assistant-js-websocket').HassEntity;
    return base as unknown as HomeAssistant;
  }

  it('returns true when supported_features includes bit 2 (DELETE)', () => {
    const hass = makeStateHass('calendar.family', 3); // bits: 1 (CREATE) + 2 (DELETE)
    assert.equal(entitySupportsDelete(hass, 'calendar.family'), true);
  });

  it('returns true when supported_features is exactly 2', () => {
    const hass = makeStateHass('calendar.family', 2);
    assert.equal(entitySupportsDelete(hass, 'calendar.family'), true);
  });

  it('returns false when bit 2 is absent (CREATE+UPDATE only)', () => {
    const hass = makeStateHass('calendar.family', 5); // bits: 1 (CREATE) + 4 (UPDATE)
    assert.equal(entitySupportsDelete(hass, 'calendar.family'), false);
  });

  it('returns false when supported_features is 0', () => {
    const hass = makeStateHass('calendar.family', 0);
    assert.equal(entitySupportsDelete(hass, 'calendar.family'), false);
  });

  it('returns false when supported_features is not a number', () => {
    const hass = makeStateHass('calendar.family', 'yes');
    assert.equal(entitySupportsDelete(hass, 'calendar.family'), false);
  });

  it('returns false when entity does not exist in hass.states', () => {
    const base: FakeHass = makeFakeHass();
    assert.equal(entitySupportsDelete(base as unknown as HomeAssistant, 'calendar.missing'), false);
  });
});

describe('subscribeEntityStates', () => {
  type Sub = { callback: (msg: unknown) => void; payload: Record<string, unknown> };

  function makeSubHass(): { hass: HomeAssistant; subs: Sub[]; unsubCount: () => number } {
    const base: FakeHass = makeFakeHass();
    const subs: Sub[] = [];
    let unsubs = 0;
    base.connection.subscribeMessage = async (
      cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
    ) => {
      subs.push({ callback: cb, payload });
      return async () => {
        unsubs++;
      };
    };
    return { hass: base as unknown as HomeAssistant, subs, unsubCount: () => unsubs };
  }

  // Regression guard for the wall-tablet error flood. This helper used to send
  // `{type: 'subscribe_trigger', trigger: {platform: 'state', ...}}`, but HA gates
  // `subscribe_trigger` behind `@decorators.require_admin`. The kiosk signs in via
  // trusted_networks as a NON-ADMIN user, so every subscription was rejected: live
  // updates never worked, and because the cards rebuilt their subscriptions on each
  // 20s poll it produced a permanent stream of server-side `Unauthorized` errors
  // (2N+1 per cycle — ~17k in one 7-hour window on a six-member family).
  // `subscribe_entities` is not admin-gated. This test fails if anyone reverts it.
  it('regression: uses subscribe_entities, NEVER the admin-only subscribe_trigger', async () => {
    const { hass, subs } = makeSubHass();
    subscribeEntityStates(hass, ['todo.anna', 'counter.anna_streak'], () => {});
    await Promise.resolve();

    assert.equal(subs.length, 1, 'one subscription covers every entity');
    assert.equal(subs[0].payload.type, 'subscribe_entities');
    assert.deepEqual(subs[0].payload.entity_ids, ['todo.anna', 'counter.anna_streak']);
    assert.equal(subs[0].payload.trigger, undefined, 'no trigger payload — that was the admin-only shape');
  });

  it('tags the opening frame as a snapshot and everything after as a change', async () => {
    const { hass, subs } = makeSubHass();
    const seen: Array<[string, string, string]> = [];
    subscribeEntityStates(hass, ['counter.anna_streak'], (id, state, phase) =>
      seen.push([id, state, phase]),
    );
    await Promise.resolve();

    // HA answers a subscribe_entities with a full-state `a` frame first.
    subs[0].callback({ a: { 'counter.anna_streak': { s: '3' } } });
    subs[0].callback({ c: { 'counter.anna_streak': { '+': { s: '4' } } } });

    assert.deepEqual(seen, [
      ['counter.anna_streak', '3', 'snapshot'],
      ['counter.anna_streak', '4', 'change'],
    ]);
  });

  // A deliberate re-subscribe (member added/renamed) builds a fresh subscription,
  // so its opening `a` frame is the ONLY place a newly watched entity's current
  // value appears — the caller's cached hass.states snapshot predates it.
  // Swallowing it left new streak counters rendering 0 until they next moved.
  it('regression: delivers the snapshot value rather than dropping it', async () => {
    const { hass, subs } = makeSubHass();
    const seen: Array<[string, string]> = [];
    subscribeEntityStates(hass, ['counter.bob_streak'], (id, state) => seen.push([id, state]));
    await Promise.resolve();

    subs[0].callback({ a: { 'counter.bob_streak': { s: '12' } } });
    assert.deepEqual(seen, [['counter.bob_streak', '12']]);
  });

  it('reports a removed entity (`r` frame) as unavailable', async () => {
    const { hass, subs } = makeSubHass();
    const seen: Array<[string, string, string]> = [];
    subscribeEntityStates(hass, ['todo.anna'], (id, state, phase) =>
      seen.push([id, state, phase]),
    );
    await Promise.resolve();

    subs[0].callback({ a: { 'todo.anna': { s: '2' } } });
    subs[0].callback({ r: ['todo.anna'] });
    assert.deepEqual(seen[1], ['todo.anna', 'unavailable', 'change']);
  });

  it('ignores an attribute-only change frame (no `s`)', async () => {
    const { hass, subs } = makeSubHass();
    const seen: Array<[string, string]> = [];
    subscribeEntityStates(hass, ['todo.anna'], (id, state) => seen.push([id, state]));
    await Promise.resolve();

    subs[0].callback({ a: {} });
    subs[0].callback({ c: { 'todo.anna': { '+': { a: { friendly_name: 'Anna' } } } } });
    assert.deepEqual(seen, [], 'no new state string, nothing to report');
  });

  it('ignores entities outside the watched set', async () => {
    const { hass, subs } = makeSubHass();
    const seen: Array<[string, string]> = [];
    subscribeEntityStates(hass, ['todo.anna'], (id, state) => seen.push([id, state]));
    await Promise.resolve();

    subs[0].callback({ a: {} });
    subs[0].callback({ c: { 'todo.bob': { '+': { s: '9' } } } });
    assert.deepEqual(seen, []);
  });

  it('does not subscribe at all for an empty entity list', async () => {
    const { hass, subs } = makeSubHass();
    subscribeEntityStates(hass, [], () => {});
    await Promise.resolve();
    assert.equal(subs.length, 0);
  });

  it('stops delivering after unsubscribe, and releases the server subscription', async () => {
    const { hass, subs, unsubCount } = makeSubHass();
    const seen: Array<[string, string]> = [];
    const unsub = subscribeEntityStates(hass, ['todo.anna'], (id, s) => seen.push([id, s]));
    await Promise.resolve();
    subs[0].callback({ a: {} });

    unsub();
    subs[0].callback({ c: { 'todo.anna': { '+': { s: '5' } } } });
    assert.deepEqual(seen, [], 'no callbacks after unsubscribe');
    assert.equal(unsubCount(), 1, 'the server-side subscription is released');
  });

  // A rejected subscription used to land in a bare `.then()` with no `.catch()`,
  // so every rejection also became an unhandled promise rejection in the kiosk's
  // WKWebView — 13 of them every 20 seconds on top of the server-side errors.
  // The library's own resubscribe path (`connection.js` `_setSocket`) calls
  // `info.subscribe()` with a bare `.then()` and no `.catch()`, so a rejected
  // resubscribe after a reconnect would skip `onError` entirely and surface as
  // an unhandled rejection. We opt out of it and re-open on 'ready' ourselves.
  it('regression: opts out of library resubscribe and re-opens on `ready`', async () => {
    const base: FakeHass = makeFakeHass();
    const subs: Array<{ payload: Record<string, unknown>; options: unknown }> = [];
    base.connection.subscribeMessage = async (
      _cb: (msg: unknown) => void,
      payload: Record<string, unknown>,
      options: unknown,
    ) => {
      subs.push({ payload, options });
      return async () => {};
    };

    const unsub = subscribeEntityStates(
      base as unknown as HomeAssistant,
      ['todo.anna'],
      () => {},
    );
    await Promise.resolve();
    assert.equal(subs.length, 1);
    assert.deepEqual(subs[0].options, { resubscribe: false });

    base.fireConnectionEvent('ready'); // the socket came back
    await Promise.resolve();
    assert.equal(subs.length, 2, 're-opened by us, through the same catch');

    unsub();
    base.fireConnectionEvent('ready');
    await Promise.resolve();
    assert.equal(subs.length, 2, 'the ready listener is removed on teardown');
  });

  // Regression guard. The library resets its command counter on close
  // (`_handleClose` sets `commandId = 1`), so ids are REUSED across reconnects,
  // and the unsubscribe closure captured the pre-disconnect id. Tearing down
  // while the post-reconnect subscribe is still in flight would have sent
  // `unsubscribe_events` for an id that now belongs to a different, live
  // subscription — silently killing another card's feed.
  it('regression: never calls a pre-reconnect unsubscribe handle', async () => {
    const base: FakeHass = makeFakeHass();
    const unsubbed: string[] = [];
    let hangNext = false;
    base.connection.subscribeMessage = async () => {
      if (hangNext) await new Promise(() => {}); // never resolves
      return async () => {
        unsubbed.push('pre-reconnect');
      };
    };

    const unsub = subscribeEntityStates(
      base as unknown as HomeAssistant,
      ['todo.anna'],
      () => {},
    );
    await Promise.resolve();

    hangNext = true;
    base.fireConnectionEvent('ready'); // reconnect; the re-open never resolves
    await Promise.resolve();

    unsub();
    await Promise.resolve();
    assert.deepEqual(
      unsubbed,
      [],
      'the stale handle is dropped on reconnect, not fired at a reused command id',
    );
  });

  it('releases a subscription that resolves after it was superseded', async () => {
    const base: FakeHass = makeFakeHass();
    let released = 0;
    let release!: (fn: () => void) => void;
    let firstCall = true;
    base.connection.subscribeMessage = async () => {
      if (firstCall) {
        firstCall = false;
        return new Promise<() => void>((res) => {
          release = res;
        });
      }
      return async () => {};
    };

    const unsub = subscribeEntityStates(
      base as unknown as HomeAssistant,
      ['todo.anna'],
      () => {},
    );
    await Promise.resolve();

    base.fireConnectionEvent('ready'); // supersedes the first attempt
    await Promise.resolve();

    // The original attempt finally resolves — its handle must be released, not
    // stored over the live one.
    release(() => {
      released += 1;
    });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(released, 1, 'the superseded handle is unsubscribed immediately');
    unsub();
  });

  it('routes a rejected reconnect re-open to onError', async () => {
    const base: FakeHass = makeFakeHass();
    let failNext = false;
    base.connection.subscribeMessage = async () => {
      if (failNext) throw new Error('Unauthorized');
      return async () => {};
    };
    const errors: unknown[] = [];
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      subscribeEntityStates(base as unknown as HomeAssistant, ['todo.anna'], () => {}, {
        onError: (err) => errors.push(err),
      });
      await new Promise((r) => setTimeout(r, 5));
      assert.deepEqual(errors, [], 'the initial subscribe succeeded');

      failNext = true;
      base.fireConnectionEvent('ready');
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(errors.length, 1, 'the caller is told, so it can retry');
    } finally {
      console.warn = originalWarn;
    }
  });

  it('regression: a rejected subscription is caught, not left unhandled', async () => {
    const base: FakeHass = makeFakeHass();
    base.connection.subscribeMessage = async () => {
      throw new Error('Unauthorized');
    };
    const originalWarn = console.warn;
    const warns: unknown[][] = [];
    console.warn = (...args: unknown[]) => warns.push(args);
    try {
      assert.doesNotThrow(() =>
        subscribeEntityStates(base as unknown as HomeAssistant, ['todo.anna'], () => {}),
      );
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(warns.length, 1);
      assert.match(String(warns[0][0]), /subscribe_entities failed/);

      // Callers are told, so a one-off rejection doesn't cost live updates forever.
      let reported: unknown = null;
      subscribeEntityStates(base as unknown as HomeAssistant, ['todo.anna'], () => {}, {
        onError: (err) => {
          reported = err;
        },
      });
      await new Promise((r) => setTimeout(r, 5));
      assert.match(String(reported), /Unauthorized/);
    } finally {
      console.warn = originalWarn;
    }
  });
});

describe('subscribeTodoItems', () => {
  it('fetches once up front, then re-fetches on each state change', async () => {
    const base: FakeHass = makeFakeHass();
    let getItems = 0;
    let push!: (msg: unknown) => void;
    base.connection.sendMessagePromise = async (payload: Record<string, unknown>) => {
      if (payload.service === 'get_items') {
        getItems++;
        return { response: { 'todo.anna': { items: [] } } };
      }
      return undefined;
    };
    base.connection.subscribeMessage = async (cb: (msg: unknown) => void) => {
      push = cb;
      return async () => {};
    };

    const unsub = subscribeTodoItems(base as unknown as HomeAssistant, 'todo.anna', () => {});
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(getItems, 1, 'initial fetch');

    push({ a: { 'todo.anna': { s: '0' } } });
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(getItems, 1, 'the opening snapshot must not duplicate the initial fetch');

    push({ c: { 'todo.anna': { '+': { s: '1' } } } });
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(getItems, 2, 'a real change re-fetches');

    // A second snapshot means the socket reconnected and replayed the
    // subscription; the list may have moved while we were away.
    push({ a: { 'todo.anna': { s: '1' } } });
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(getItems, 3, 'a post-reconnect snapshot re-fetches');
    unsub();
  });
});
