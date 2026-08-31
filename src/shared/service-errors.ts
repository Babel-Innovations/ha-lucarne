/**
 * The user-facing message for a value thrown by an HA service or WS call.
 *
 * `instanceof Error` is the wrong test here, which is why every card used to
 * show its generic fallback no matter what the backend said (#128).
 * `home-assistant-js-websocket` rejects with the server's payload *itself* —
 * `info.reject(message.error)` — and that payload is a plain `{ code, message }`
 * object, not an `Error`. So the guard always fell through, discarding #119's
 * carefully worded `ServiceValidationError` text before the user could read it.
 * `String(err)` on that object is worse still: it renders `[object Object]`.
 *
 * `fallback` is only for the genuinely message-less case, so it stays
 * action-specific at each call site ('Failed to delete', 'Failed to add task', …).
 */
export function serviceErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return nonEmpty(err.message) ?? fallback;
  if (typeof err === 'string') return nonEmpty(err) ?? fallback;
  // The `{ code, message }` websocket payload. Own-property only, so a message
  // inherited from the prototype chain can never stand in for a real one.
  // `hasOwnProperty.call` rather than `Object.hasOwn`: that is ES2022, and
  // `build.target` lowers syntax without polyfilling runtime APIs, so it would
  // throw on the iPadOS 15 wall tablet.
  if (typeof err === 'object' && err !== null && Object.prototype.hasOwnProperty.call(err, 'message')) {
    const { message } = err as { message: unknown };
    if (typeof message === 'string') return nonEmpty(message) ?? fallback;
  }
  return fallback;
}

/** The string, or undefined when it is empty or only whitespace. */
function nonEmpty(value: string): string | undefined {
  return value.trim() ? value : undefined;
}
