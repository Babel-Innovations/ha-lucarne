import { LitElement, html } from 'lit';
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
 * Base class for the three top-level Lucarne cards.
 *
 * Subclasses implement `renderContent()` instead of `render()`. The base
 * `render()` wraps that call in a try/catch so a synchronous throw in the
 * card's render-time data prep degrades to a small in-card notice — and is
 * reported — instead of propagating to Home Assistant's red `hui-error-card`,
 * which stays dead until the whole dashboard is rebuilt (i.e. the iPad app is
 * force-quit and reopened).
 *
 * This only catches throws raised synchronously inside the card's own
 * `renderContent()` (including its getters/helpers). Exceptions thrown inside
 * child components render in their own update cycle and are caught by the global
 * handlers in error-reporter.ts instead.
 */
export abstract class LucarneCardBase extends LitElement {
  /** Subclass template. Replaces Lit's `render()`; do not override `render()`. */
  protected abstract renderContent(): unknown;

  protected render(): unknown {
    // Arm the reporter *before* renderContent so a throw on the very first
    // render is still forwarded. `updated()` runs after render(), so relying on
    // it alone would silently drop a first-render crash — precisely the
    // headless-iPad case this boundary targets.
    const ctx = this as unknown as ReporterContext;
    configureErrorReporter(ctx.hass, ctx._config?.debug);
    try {
      return this.renderContent();
    } catch (err) {
      reportLucarneError(err, this.tagName.toLowerCase());
      return LucarneCardBase._errorFallback();
    }
  }

  /**
   * Minimal fallback. Uses an inline style rather than the card's `static
   * styles` so it renders correctly even if the failure was style-related, and
   * so the base doesn't depend on any subclass's stylesheet.
   */
  private static _errorFallback(): unknown {
    return html`
      <ha-card>
        <div style="padding:16px;color:var(--secondary-text-color);font-size:14px">
          This card hit an error and will recover on the next update.
        </div>
      </ha-card>
    `;
  }
}
