import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import Cropper from 'cropperjs';
import type { HomeAssistant } from '../shared/types.js';
import { lucarneStyles } from '../shared/design-tokens.js';
import { cropperCss } from '../shared/cropper-styles.js';
import { setMemberAvatar, uploadAvatar } from '../shared/integration-services.js';
import { serviceErrorMessage } from '../shared/service-errors.js';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const OUTPUT_SIZE = 512;

const COMMON_EMOJI = [
  '👶','🧒','👧','🧑','👦','👩','👨','🧓','👴','👵',
  '🐶','🐱','🐻','🐼','🐨','🦊','🦁','🐯','🐸','🦄',
  '🌟','⭐','🌈','🌸','🌺','🌻','🍀','🎈','🎨','🎯',
  '🏃','⚽','🎸','🎤','📚','🎮','🏆','❤️','💙','💚',
];

type Mode = 'emoji' | 'upload';

@customElement('lucarne-avatar-upload-modal')
export class LucarneAvatarUploadModal extends LitElement {
  static styles = [
    lucarneStyles,
    unsafeCSS(cropperCss),
    css`
      :host {
        display: block;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal {
        background: var(--card-background-color, #fff);
        border-radius: var(--lucarne-radius-lg);
        padding: var(--lucarne-spacing-lg);
        width: min(420px, 92vw);
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-md);
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .modal-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 600;
        color: var(--lucarne-on-surface);
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
      }
      .mode-tabs {
        display: flex;
        border-bottom: 1px solid rgba(0,0,0,0.1);
      }
      .mode-tab {
        flex: 1;
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        transition: all 0.15s;
      }
      .mode-tab.active {
        border-bottom-color: var(--primary-color);
        color: var(--primary-color);
        font-weight: 600;
      }
      .emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
      }
      .emoji-btn {
        background: none;
        border: 1px solid transparent;
        border-radius: var(--lucarne-radius-sm);
        font-size: 1.4rem;
        cursor: pointer;
        padding: 4px;
        text-align: center;
        transition: background 0.1s;
      }
      .emoji-btn:hover {
        background: rgba(0,0,0,0.05);
      }
      .emoji-btn.selected {
        border-color: var(--primary-color);
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1);
      }
      .upload-area {
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-sm);
      }
      .picker {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-lg);
        border: 2px dashed rgba(0,0,0,0.18);
        border-radius: var(--lucarne-radius-md);
        text-align: center;
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
      }
      .picker-button {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-lg);
        border-radius: 999px;
        border: 1px solid var(--primary-color);
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.08);
        color: var(--primary-color);
        font-weight: 600;
        cursor: pointer;
      }
      input[type='file'] {
        display: none;
      }
      .crop-stage {
        position: relative;
        width: 100%;
        /* cropperjs needs a fixed-size container so it can compute layout. */
        height: 320px;
        background: #000;
        border-radius: var(--lucarne-radius-md);
        overflow: hidden;
      }
      .crop-stage img {
        display: block;
        max-width: 100%;
      }
      /* Round preview overlay so the user sees how the avatar will look. */
      .crop-stage .cropper-view-box,
      .crop-stage .cropper-face {
        border-radius: 50%;
      }
      .crop-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .crop-hint {
        font-size: var(--lucarne-fs-xs);
        color: var(--lucarne-on-surface-muted);
      }
      .link-btn {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        padding: 0;
      }
      .error-msg {
        color: var(--error-color, #b00020);
        font-size: var(--lucarne-fs-sm);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-xs);
      }
      .btn {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-lg);
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 500;
        transition: opacity 0.15s;
      }
      .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn-primary {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .btn-secondary {
        background: transparent;
        border: 1px solid rgba(0,0,0,0.2);
        color: var(--lucarne-on-surface);
      }
    `,
  ];

  @property({ attribute: false }) hass!: HomeAssistant;
  @property() memberSlug!: string;
  @property() memberName!: string;

  @state() private _mode: Mode = 'emoji';
  @state() private _selectedEmoji: string | null = null;
  @state() private _sourceUrl: string | null = null;
  @state() private _error: string | null = null;
  @state() private _submitting = false;

  @query('#crop-image') private _cropImage?: HTMLImageElement;

  private _cropper: Cropper | null = null;

  private _close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private _selectEmoji(emoji: string) {
    this._selectedEmoji = emoji;
    this._error = null;
  }

  private _onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    // Allow the same file to be picked again later by clearing the input value.
    input.value = '';
    if (!file) return;

    if (!ALLOWED_MIME.has(file.type)) {
      this._error = 'Only PNG, JPEG, and WebP images are accepted.';
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      this._error = 'Image must be 2 MB or smaller.';
      return;
    }

    this._error = null;
    this._setSource(URL.createObjectURL(file));
  }

  private _setSource(url: string | null) {
    if (this._cropper) {
      this._cropper.destroy();
      this._cropper = null;
    }
    if (this._sourceUrl) {
      URL.revokeObjectURL(this._sourceUrl);
    }
    this._sourceUrl = url;
  }

  private _onCropImageLoad() {
    const img = this._cropImage;
    if (!img) return;
    if (this._cropper) {
      this._cropper.destroy();
    }
    this._cropper = new Cropper(img, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.9,
      background: false,
      cropBoxResizable: true,
      cropBoxMovable: true,
      toggleDragModeOnDblclick: false,
      guides: false,
      center: false,
    });
  }

  private _clearPickedImage() {
    this._setSource(null);
    this._error = null;
  }

  private async _submit() {
    if (this._submitting) return;
    this._error = null;

    if (this._mode === 'emoji') {
      if (!this._selectedEmoji) {
        this._error = 'Pick an emoji first.';
        return;
      }
      this._submitting = true;
      try {
        await setMemberAvatar(this.hass, this.memberSlug, this._selectedEmoji);
        this.dispatchEvent(
          new CustomEvent('avatar-changed', { detail: { avatar: this._selectedEmoji } }),
        );
        this._close();
      } catch (err) {
        this._error = serviceErrorMessage(err, 'Failed to save avatar');
      } finally {
        this._submitting = false;
      }
      return;
    }

    if (!this._sourceUrl || !this._cropper) {
      this._error = 'Pick an image first.';
      return;
    }

    this._submitting = true;
    try {
      const file = await this._getCroppedFile();
      await uploadAvatar(this.hass, this.memberSlug, file);
      this.dispatchEvent(new CustomEvent('avatar-changed'));
      this._close();
    } catch (err) {
      this._error = serviceErrorMessage(err, 'Failed to upload avatar');
    } finally {
      this._submitting = false;
    }
  }

  private _getCroppedFile(): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!this._cropper) {
        reject(new Error('Cropper not initialized'));
        return;
      }
      const canvas = this._cropper.getCroppedCanvas({
        width: OUTPUT_SIZE,
        height: OUTPUT_SIZE,
        imageSmoothingQuality: 'high',
      });
      if (!canvas) {
        reject(new Error('Failed to crop image'));
        return;
      }
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to encode cropped image'));
            return;
          }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9,
      );
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._setSource(null);
  }

  render() {
    return html`
      <div class="backdrop" @click=${(e: Event) => { if (e.target === e.currentTarget) this._close(); }}>
        <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <span class="modal-title">Change avatar — ${this.memberName}</span>
            <button class="close-btn" @click=${this._close}>✕</button>
          </div>

          <div class="mode-tabs">
            <button
              class="mode-tab ${this._mode === 'emoji' ? 'active' : ''}"
              @click=${() => { this._mode = 'emoji'; this._error = null; }}
            >Emoji</button>
            <button
              class="mode-tab ${this._mode === 'upload' ? 'active' : ''}"
              @click=${() => { this._mode = 'upload'; this._error = null; }}
            >Upload photo</button>
          </div>

          ${this._mode === 'emoji' ? this._renderEmojiMode() : this._renderUploadMode()}

          ${this._error ? html`<div class="error-msg">${this._error}</div>` : ''}

          <div class="actions">
            <button class="btn btn-secondary" @click=${this._close}>Cancel</button>
            <button
              class="btn btn-primary"
              ?disabled=${this._submitting}
              @click=${this._submit}
            >${this._submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderEmojiMode() {
    return html`
      <div class="emoji-grid">
        ${COMMON_EMOJI.map(
          (emoji) => html`
            <button
              class="emoji-btn ${this._selectedEmoji === emoji ? 'selected' : ''}"
              @click=${() => this._selectEmoji(emoji)}
              title=${emoji}
            >${emoji}</button>
          `,
        )}
      </div>
    `;
  }

  private _renderUploadMode() {
    if (this._sourceUrl) {
      return html`
        <div class="upload-area">
          <div class="crop-stage">
            <img
              id="crop-image"
              src=${this._sourceUrl}
              alt="Crop preview"
              @load=${this._onCropImageLoad}
            />
          </div>
          <div class="crop-actions">
            <button class="link-btn" @click=${this._clearPickedImage}>Choose different image</button>
            <span class="crop-hint">Drag to position · drag corners to resize</span>
          </div>
        </div>
      `;
    }
    return html`
      <div class="upload-area">
        <div class="picker">
          <button type="button" class="picker-button" @click=${this._openFilePicker}>Add picture</button>
          <span>Click the button above to choose an image.</span>
          <span>Supports PNG, JPEG, or WebP (max 2 MB).</span>
        </div>
        <input
          type="file"
          id="avatar-file-input"
          accept="image/png,image/jpeg,image/webp"
          @change=${this._onFileChange}
        />
      </div>
    `;
  }

  private _openFilePicker() {
    const input = this.renderRoot.querySelector('#avatar-file-input') as HTMLInputElement | null;
    input?.click();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lucarne-avatar-upload-modal': LucarneAvatarUploadModal;
  }
}
