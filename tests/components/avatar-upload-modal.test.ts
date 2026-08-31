import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeHass } from '../setup/ha-mock.mjs';
import type { LucarneAvatarUploadModal } from '../../src/components/avatar-upload-modal.js';

await import('../../src/components/avatar-upload-modal.js');

function makeEl(memberSlug = 'anna', memberName = 'Anna'): LucarneAvatarUploadModal {
  const el = document.createElement('lucarne-avatar-upload-modal') as LucarneAvatarUploadModal;
  el.hass = makeFakeHass() as any;
  el.memberSlug = memberSlug;
  el.memberName = memberName;
  document.body.appendChild(el);
  return el;
}

function shadow(el: LucarneAvatarUploadModal, sel: string): Element | null {
  return el.shadowRoot?.querySelector(sel) ?? null;
}

afterEach(() => {
  document.querySelectorAll('lucarne-avatar-upload-modal').forEach((el) => el.remove());
});

describe('lucarne-avatar-upload-modal', () => {
  it('renders backdrop and modal', async () => {
    const el = makeEl();
    await el.updateComplete;

    assert.ok(shadow(el, '.backdrop'), 'backdrop rendered');
    assert.ok(shadow(el, '.modal'), 'modal rendered');
    assert.ok(shadow(el, '.modal-title'), 'modal title rendered');
  });

  it('shows emoji tab active by default', async () => {
    const el = makeEl();
    await el.updateComplete;

    const activeTab = shadow(el, '.mode-tab.active');
    assert.ok(activeTab?.textContent?.toLowerCase().includes('emoji'), 'emoji tab active');
    assert.ok(shadow(el, '.emoji-grid'), 'emoji grid shown in default mode');
  });

  it('switches to upload mode on tab click', async () => {
    const el = makeEl();
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('.mode-tab');
    const uploadTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('upload'));
    assert.ok(uploadTab, 'upload tab present');
    (uploadTab as HTMLElement).click();
    await el.updateComplete;

    assert.ok(shadow(el, '.upload-area'), 'upload area shown after switching mode');
    assert.ok(!shadow(el, '.emoji-grid'), 'emoji grid hidden in upload mode');
  });

  it('emoji mode: clicking Save calls set_member_avatar with selected emoji', async () => {
    const fakeHass = makeFakeHass();
    const el = makeEl();
    el.hass = fakeHass as any;
    await el.updateComplete;

    // Pick first emoji in grid
    const firstEmoji = shadow(el, '.emoji-btn') as HTMLElement;
    assert.ok(firstEmoji, 'emoji buttons present');
    const emojiText = firstEmoji.textContent!.trim();
    firstEmoji.click();
    await el.updateComplete;

    // Click Save
    const saveBtn = Array.from(el.shadowRoot!.querySelectorAll('.btn-primary')) as HTMLButtonElement[];
    saveBtn[0]?.click();
    await el.updateComplete;

    // Wait for the async service call
    await new Promise((r) => setTimeout(r, 10));

    const serviceCalls = fakeHass.calls.callService;
    assert.equal(serviceCalls.length, 1, 'one service call made');
    assert.equal(serviceCalls[0].domain, 'lucarne_family');
    assert.equal(serviceCalls[0].service, 'set_member_avatar');
    assert.equal(serviceCalls[0].payload.member, 'anna');
    assert.equal(serviceCalls[0].payload.avatar, emojiText);
  });

  it('emoji mode: Save without selection shows error, no service call', async () => {
    const fakeHass = makeFakeHass();
    const el = makeEl();
    el.hass = fakeHass as any;
    await el.updateComplete;

    const saveBtn = Array.from(el.shadowRoot!.querySelectorAll('.btn-primary')) as HTMLButtonElement[];
    saveBtn[0]?.click();
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(fakeHass.calls.callService.length, 0, 'no service call without selection');
    assert.ok(shadow(el, '.error-msg'), 'error message shown');
  });

  it('emoji mode: shows the server message when set_member_avatar rejects', async () => {
    const fakeHass = makeFakeHass();
    const el = makeEl();
    el.hass = fakeHass as any;
    await el.updateComplete;

    (shadow(el, '.emoji-btn') as HTMLElement).click();
    await el.updateComplete;

    // HA rejects with its plain `{ code, message }` payload, not an Error. This
    // used to hit `String(err)` and render "[object Object]" at the user (#128).
    (el.hass as any).callService = async () => {
      throw { code: 'unknown_error', message: 'Member anna does not exist' };
    };

    const saveBtn = Array.from(el.shadowRoot!.querySelectorAll('.btn-primary')) as HTMLButtonElement[];
    saveBtn[0]?.click();
    await new Promise((r) => setTimeout(r, 10));
    await el.updateComplete;

    const text = shadow(el, '.error-msg')?.textContent ?? '';
    assert.match(text, /Member anna does not exist/, "the server's message reaches the modal");
    assert.doesNotMatch(text, /\[object Object\]/, 'never stringify the payload object at the user');
  });

  it('upload mode: shows file picker initially (no source URL)', async () => {
    const el = makeEl();
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('.mode-tab');
    const uploadTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('upload')) as HTMLElement;
    uploadTab.click();
    await el.updateComplete;

    assert.ok(shadow(el, 'input[type="file"]'), 'file input present');
    assert.ok(shadow(el, '.picker'), 'picker UI shown');
    assert.equal(shadow(el, '#crop-image'), null, 'crop stage not shown before a file is picked');
  });

  it('upload mode: oversized file shows inline error, no source URL set', async () => {
    const fakeHass = makeFakeHass();
    const el = makeEl();
    el.hass = fakeHass as any;
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('.mode-tab');
    const uploadTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('upload')) as HTMLElement;
    uploadTab.click();
    await el.updateComplete;

    const fileInput = shadow(el, 'input[type="file"]') as HTMLInputElement;
    const oversized = new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { value: [oversized] });
    fileInput.dispatchEvent(new Event('change'));
    await el.updateComplete;

    assert.ok(shadow(el, '.error-msg'), 'error shown for oversized file');
    assert.equal(shadow(el, '#crop-image'), null, 'no crop stage shown');
    assert.equal(fakeHass.calls.callService.length, 0, 'no service call');
  });

  it('upload mode: unsupported MIME shows inline error', async () => {
    const el = makeEl();
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('.mode-tab');
    const uploadTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('upload')) as HTMLElement;
    uploadTab.click();
    await el.updateComplete;

    const fileInput = shadow(el, 'input[type="file"]') as HTMLInputElement;
    const gif = new File([new Uint8Array(100)], 'anim.gif', { type: 'image/gif' });
    Object.defineProperty(fileInput, 'files', { value: [gif] });
    fileInput.dispatchEvent(new Event('change'));
    await el.updateComplete;

    assert.ok(shadow(el, '.error-msg'), 'error shown for unsupported MIME');
  });

  it('upload mode: Save without picked image shows error, no service call', async () => {
    const fakeHass = makeFakeHass();
    const el = makeEl();
    el.hass = fakeHass as any;
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('.mode-tab');
    const uploadTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('upload')) as HTMLElement;
    uploadTab.click();
    await el.updateComplete;

    const saveBtn = el.shadowRoot!.querySelector('.btn-primary') as HTMLButtonElement;
    saveBtn?.click();
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(fakeHass.calls.callService.length, 0, 'no service call without picked image');
    assert.ok(shadow(el, '.error-msg'), 'error message shown');
  });

  it('upload mode: Save with initialized cropper calls upload_avatar with cropped JPEG', async () => {
    const fakeHass = makeFakeHass();
    const el = makeEl();
    el.hass = fakeHass as any;
    await el.updateComplete;

    const tabs = el.shadowRoot!.querySelectorAll('.mode-tab');
    const uploadTab = Array.from(tabs).find((t) => t.textContent?.toLowerCase().includes('upload')) as HTMLElement;
    uploadTab.click();
    await el.updateComplete;

    // Avoid cropperjs DOM work that happy-dom can't fully simulate: stub the cropper
    // instance and pretend a file has been picked.
    const fakeBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' });
    const fakeCanvas = {
      toBlob: (cb: (b: Blob | null) => void) => cb(fakeBlob),
    } as unknown as HTMLCanvasElement;
    const anyEl = el as unknown as { _sourceUrl: string | null; _cropper: unknown };
    anyEl._sourceUrl = 'blob:fake';
    anyEl._cropper = {
      getCroppedCanvas: () => fakeCanvas,
      destroy: () => {},
    };

    const saveBtn = el.shadowRoot!.querySelector('.btn-primary') as HTMLButtonElement;
    saveBtn.click();
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 30));

    const serviceCalls = fakeHass.calls.callService;
    assert.equal(serviceCalls.length, 1, 'one service call');
    assert.equal(serviceCalls[0].domain, 'lucarne_family');
    assert.equal(serviceCalls[0].service, 'upload_avatar');
    assert.equal(serviceCalls[0].payload.member, 'anna');
    assert.equal(serviceCalls[0].payload.mime_type, 'image/jpeg');
    assert.ok(
      typeof serviceCalls[0].payload.image_data === 'string' && serviceCalls[0].payload.image_data.length > 0,
      'image_data is non-empty base64 string',
    );
  });

  it('close button dispatches close event', async () => {
    const el = makeEl();
    await el.updateComplete;

    let closed = false;
    el.addEventListener('close', () => { closed = true; });

    const closeBtn = shadow(el, '.close-btn') as HTMLButtonElement;
    closeBtn.click();

    assert.ok(closed, 'close event fired');
  });
});
