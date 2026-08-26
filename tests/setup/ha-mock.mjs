/**
 * Shared HomeAssistant stub for component tests.
 *
 * makeFakeHass() returns a minimal HA mock that satisfies the HomeAssistant
 * interface used across cards. Each channel records calls on a public `calls`
 * map so tests can assert on payloads and ordering.
 *
 * Usage:
 *   import { makeFakeHass } from '../setup/ha-mock.mjs';
 *   const fakeHass = makeFakeHass();
 *   fakeHass.states['todo.anna'] = { state: 'on', attributes: {} };
 *   element.hass = fakeHass;
 *   // later:
 *   assert.equal(fakeHass.calls.callService.length, 1);
 */

/**
 * @returns {import('../../src/shared/types.js').HomeAssistant & { calls: object }}
 */
export function makeFakeHass(overrides = {}) {
  const calls = {
    subscribeMessage: [],
    sendMessagePromise: [],
    subscribeEvents: [],
    callApi: [],
    callService: [],
    callWS: [],
    addEventListener: [],
  };

  /** eventType -> listeners, for the connection event emitter stub. */
  const connectionListeners = new Map();

  const hass = {
    states: {},
    connection: {
      async subscribeMessage(callback, payload) {
        calls.subscribeMessage.push({ callback, payload });
        return async () => {};
      },
      async sendMessagePromise(payload) {
        calls.sendMessagePromise.push({ payload });
        return undefined;
      },
      async subscribeEvents(callback, eventType) {
        calls.subscribeEvents.push({ callback, eventType });
        return async () => {};
      },
      // home-assistant-js-websocket's Connection is an event emitter. The cards
      // use the 'ready' event to re-open subscriptions themselves after a
      // reconnect (the library's own resubscribe path swallows rejections), so
      // the stub has to carry it. `fireConnectionEvent` lets a test replay one.
      addEventListener(eventType, callback) {
        calls.addEventListener.push({ eventType, callback });
        const list = connectionListeners.get(eventType) ?? [];
        list.push(callback);
        connectionListeners.set(eventType, list);
      },
      removeEventListener(eventType, callback) {
        const list = connectionListeners.get(eventType) ?? [];
        const i = list.indexOf(callback);
        if (i !== -1) list.splice(i, 1);
      },
    },
    async callApi(method, path, body) {
      calls.callApi.push({ method, path, body });
      return undefined;
    },
    async callService(domain, service, payload, target) {
      calls.callService.push({ domain, service, payload, target });
      return undefined;
    },
    async callWS(payload) {
      calls.callWS.push({ payload });
      return undefined;
    },
    calls,
    /** Replay a Connection event (e.g. 'ready' after a simulated reconnect). */
    fireConnectionEvent(eventType) {
      for (const cb of [...(connectionListeners.get(eventType) ?? [])]) {
        cb(hass.connection);
      }
    },
    ...overrides,
  };

  return hass;
}
