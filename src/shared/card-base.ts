import { LitElement, html } from 'lit';
import { state } from 'lit/decorators.js';
import { reportLucarneError, configureErrorReporter } from './error-reporter.js';
import type { HomeAssistant } from './types.js';

/**
 * Fields the boundary reads off the concrete card to arm the reporter before
 * render. All three cards store their resolved config in `_config` (with the
 * optional `debug` flag) and Home Assistant in `hass`.
 */
type ReporterContext = {
  hass?: HomeAssistant;
  _config?: { debug?: boolean };
};

/**
 * A deliberate, user-facing config validation failure — "you wrote the YAML
 * wrong", not "the card has a bug".
 *
 * Home Assistant's `setConfig` contract is to throw for invalid config, and it
 * renders the thrown message for the user. Those messages are already
 * Lucarne-owned and readable (`lucarne-chores-card: members must be an array`),
 * so the base boundary deliberately lets them through. Everything *else* thrown
 * out of config handling is our bug, and is contained instead.
 */
export class LucarneConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LucarneConfigError';
  }
}

/**
 * Base class for the three top-level Lucarne cards.
 *
 * Subclasses implement `renderContent()` instead of `render()`, and
 * `applyConfig()` instead of `setConfig()`. The base wraps both so that a
 * synchronous throw degrades to a small in-card notice — and is reported —
 * instead of propagating to Home Assistant's red `hui-error-card`, which stays
 * dead until the whole dashboard is rebuilt (i.e. the iPad app is force-quit and
 * reopened).
 *
 * The render boundary only catches throws raised synchronously inside the card's
 * own `renderContent()` (including its getters/helpers). Exceptions thrown inside
 * child components render in their own update cycle and are caught by the global
 * handlers in error-reporter.ts instead.
 *
 * Neither boundary can catch a *parse-time* failure of the bundle itself — see
 * tests/build/bundle-syntax.test.ts and issue #101. If no card renders at all,
 * suspect the build target, not this class.
 */
export abstract class LucarneCardBase<TConfig = unknown> extends LitElement {
  /** Subclass template. Replaces Lit's `render()`; do not override `render()`. */
  protected abstract renderContent(): unknown;

  /**
   * Subclass config handler. Replaces Home Assistant's `setConfig()`; do not
   * override `setConfig()`. Throw `LucarneConfigError` for invalid user config.
   */
  protected abstract applyConfig(config: TConfig): void;

  /** Message from a contained (non-validation) config failure, if any. */
  @state() protected _configFailure?: string;

  /**
   * Home Assistant's entry point. Runs before `hass` is ever assigned, which
   * makes it the earliest moment `debug: true` is visible to us.
   */
  setConfig(config: TConfig): void {
    // Arm the reporter *first*, so a throw in the subclass's own validation is
    // still forwarded. Passing `undefined` for hass is deliberate: there is no
    // hass yet at this point, and the reporter buffers until one arrives.
    configureErrorReporter(undefined, (config as { debug?: boolean } | undefined)?.debug);
    this._configFailure = undefined;
    try {
      this.applyConfig(config);
    } catch (err) {
      // Deliberate validation failure — HA's contract, and the message is already
      // readable. Let it reach the user.
      if (err instanceof LucarneConfigError) throw err;
      // Anything else is our bug. Contain it: a throw here replaces the card with
      // HA's generic error panel, which carries no Lucarne detail and is useless
      // on a headless wall tablet.
      reportLucarneError(err, `${this.tagName.toLowerCase()}.setConfig`);
      this._configFailure = err instanceof Error ? err.message : String(err);
    }
  }

  protected render(): unknown {
    // Arm the reporter *before* renderContent so a throw on the very first
    // render is still forwarded. `updated()` runs after render(), so relying on
    // it alone would silently drop a first-render crash — precisely the
    // headless-iPad case this boundary targets.
    const ctx = this as unknown as ReporterContext;
    configureErrorReporter(ctx.hass, ctx._config?.debug);
    if (this._configFailure !== undefined) {
      return LucarneCardBase._notice(`This card could not read its configuration: ${this._configFailure}`);
    }
    try {
      return this.renderContent();
    } catch (err) {
      reportLucarneError(err, this.tagName.toLowerCase());
      return LucarneCardBase._notice('This card hit an error and will recover on the next update.');
    }
  }

  /**
   * Minimal fallback. Uses an inline style rather than the card's `static
   * styles` so it renders correctly even if the failure was style-related, and
   * so the base doesn't depend on any subclass's stylesheet.
   */
  private static _notice(message: string): unknown {
    return html`
      <ha-card>
        <div style="padding:16px;color:var(--secondary-text-color);font-size:14px">
          ${message}
        </div>
      </ha-card>
    `;
  }
}
