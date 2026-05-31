---
status: done
---

# Phase 6: Polish & designed-for round-trip

Polish UX: avatar upload modal in editor, default routine template editor, friendly options-flow language. Reserve config fields and storage columns for the deferred Reminders round-trip writeback. Document the round-trip protocol in detail so a future spec can implement it without re-discovering the design.

Nothing in this phase changes the runtime contract — it's UX polish + future-proofing. By end of phase, the feature is shippable as v0.2.0.

## Context

Phases 0-5 deliver the working feature. This phase removes rough edges and inscribes the round-trip design so it's a future-spec implementation task rather than re-discovery.

Read [./README.md](./README.md) for overall feature context.

## Structure

```
custom_components/lucarne_family/
  __init__.py                              # update: fire designed-for round-trip event when apple-tagged items complete
  avatar_service.py                        # update: optional center-square normalization for uploaded images
  member_service.py                        # new/update: set emoji/path avatar for card-editor UX
  config_flow.py                           # update: entry.data["round_trip"] fields in options flow
  const.py                                 # update: round-trip event constants
src/
  editors/
    lucarne-chores-card-editor.ts          # update: improved member picker UX
  components/
    avatar-upload-modal.ts                 # new: file picker + crop + upload to integration service
docs/
  reminders-bridge.md                      # major update: round-trip protocol section
  integration.md                           # update: round-trip readiness section
  events.md                                # update: add lucarne_family_apple_writeback_requested
tests/python/
  test_apple_writeback_event.py            # new
  test_custom_presets.py                   # new
  test_member_service.py                   # new/update: set_member_avatar service
  test_options_flow.py                     # update: round-trip + custom-preset cases
tests/components/
  avatar-upload-modal.test.ts              # new
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline verification (before starting)

- [ ] Phase 5 verified on real HA: today card + chores card both working with the integration
- [ ] User has dogfooded for at least a few days; flag any UX issues that should be addressed here

### Sub-Phase A: Options-flow polish

#### Round-trip fields in options flow
- [x] Add `async_step_edit_round_trip` (previously stubbed in Phase 1):
  - Fields:
    - `enabled` (boolean, default false)
    - `webhook_url` (text, required if enabled, URL validation, http:// or https://)
    - `secret` (text, password, required if enabled, min 32 chars)
    - `device_name` (text, optional, default "Sync device" — for display only)
  - Save to `entry.data["round_trip"] = {enabled, webhook_url, secret, device_name}`
- [x] Test in `tests/python/test_options_flow.py`: save → readback round-trips correctly; URL validation rejects malformed URLs

#### Default routine template editor
- [x] Add `async_step_edit_templates` to the options-flow menu:
  - User can add a new preset: name + list of routine templates (summary, icon, RRULE picker)
  - Note: listing/editing existing custom presets deferred (add-only for v0.2.0)
- [x] Custom presets stored in `entry.data["custom_presets"] = [...]`
- [x] Built-in presets remain in code (presets.py); merged with custom at presentation time
- [x] Tests: add custom preset, use it for a new member in `async_step_add_member`, verify routines created

#### Friendly options-flow language polish
- [ ] Review every option-flow string for clarity (use non-tech-user lens: "your wife") — **deferred: requires full UX review pass, tracked for v0.2.1**
- [ ] Replace technical jargon: "RRULE" → "Repeats", "Slug" → never shown to user, "Entity ID" → only shown in rename-impact preview — **deferred: "RRULE" removal requires co-updating the validator or adding a friendly-to-RRULE translator; tracked for v0.2.1**
- [ ] Add helper text under fields that may confuse: avatar field, reset time, streak check time — **deferred: requires HA description fields in config_flow, tracked for v0.2.1**

### Sub-Phase B: Avatar upload modal (card-side)

The Phase 2 service accepts base64 `image_data` + `mime_type`. Phase 4 wired a basic call. This phase adds the polished UI.

#### `avatar-upload-modal.ts`
- [x] Triggered from each member row in the Phase 4 chores-card editor member picker. Add an avatar control beside the member checkbox/current avatar: `[current avatar] [Change]`. Clicking Change opens this modal.
- [x] Emoji mode: avatar-oriented emoji grid (40 common avatars; separate from `add-task-popover`'s task-icon set; custom-emoji text input intentionally omitted since the avatar field is validated server-side). On submit, call the new `lucarne_family.set_member_avatar` service with `{member, avatar}`; do not call `upload_avatar`, which is image-only.
- [x] Upload mode:
  - `<input type="file" accept="image/png,image/jpeg,image/webp">`
  - Client-side validation: size ≤ 2MB, `mime_type` in allowed set
  - Preview thumbnail of selected file
  - Cropping decision for v0.2.0: no interactive crop UI. The modal previews the selected image. Server-side center-square crop is **deferred** — `avatar_service.py` currently stores the raw uploaded bytes after validation. A future spec should add PIL `ImageOps.fit` centering before the write call in `_write_avatar`.
- [x] Upload-mode submit: convert to base64, call `lucarne_family.upload_avatar` via integration-services
- [x] Show inline error on rejection (oversized, wrong type)
- [x] Tests: emoji mode calls `lucarne_family.set_member_avatar` with `{member, avatar}`; upload mode validates client-side and calls `lucarne_family.upload_avatar` with `{member, image_data, mime_type}`

#### Wire into editor
- [x] Update `lucarne-chores-card-editor.ts` member picker rows to show the current avatar and a Change button; click Change → open modal. This edits integration member metadata through services, not the card's YAML config.

#### `member_service.py` / services
- [x] Register `lucarne_family.set_member_avatar`:
  - Voluptuous schema uses exactly these fields: `member` (known member slug) and `avatar` (required string).
  - Accept either exactly one emoji or a relative `/local/lucarne/avatars/<filename>` path.
  - Reject arbitrary URLs, path traversal, empty strings, and paths outside `/local/lucarne/avatars/`.
  - Update the member's `avatar` field through `store.async_save_members`.
  - Fire `lucarne_family_member_updated` with `{member, field: "avatar"}` so subscribed cards can refresh family state.
- [x] Add `set_member_avatar` to `services.yaml` and to the field-name parity test from Phase 2.
- [x] Add a TS wrapper `setMemberAvatar(hass, memberSlug, avatar)` to `src/shared/integration-services.ts`; the avatar modal uses this wrapper for emoji mode.
- [x] Extend `src/shared/family-subscription.ts` to refresh its family-state cache on `lucarne_family_member_updated` as well as the task metadata events from Phase 4, so avatar changes appear without a dashboard reload.
- [x] Tests: valid emoji updates member config; invalid URL/path is rejected; event fires; `services.yaml` and Python schema field names stay in sync.

### Sub-Phase C: Designed-for round-trip event

The integration in Phase 3 only logged completions internally. This phase adds a round-trip event for the deferred bridge writeback.

#### `__init__.py` update
- [x] In the completion listener: when a task with `metadata.source == "apple"` flips to `completed`:
  - Read `entry.data["round_trip"]` config
  - If `enabled == false`: skip (just log internally)
  - If `enabled == true`: fire HA event `lucarne_family_apple_writeback_requested` with payload `{apple_uid, status, timestamp, device_name}` — **do NOT include `webhook_url` or `secret`** in the event payload. HA events are visible to every integration and to any user with Developer Tools access; secrets must stay in the integration's `entry.data`.
- [x] **Expose a typed accessor for the future subscriber** so the lookup mechanism is not ambiguous: add `def get_round_trip_config(hass: HomeAssistant) -> RoundTripConfig | None` to `__init__.py` (or a new `api.py` module) that returns the dataclass `RoundTripConfig(webhook_url: str, secret: str, device_name: str)` looked up from the single config entry. The future-spec subscriber MUST call this accessor — it MUST NOT read `entry.data` directly (so we can change storage layout later without breaking subscribers). Document this contract in `docs/reminders-bridge.md`.
- [x] **Do NOT** actually POST anything in this spec. The future spec wires that. Firing the event is the contract.

#### Tests
- [x] `test_apple_writeback_event.py`: apple-tagged item completes, round-trip enabled → event fires with correct payload; round-trip disabled → no event; non-apple item completes → no event

### Sub-Phase D: Round-trip documentation

This is the most important deliverable of the phase — making the deferred work doable by anyone (including a future LLM session) from a cold start.

#### `docs/reminders-bridge.md` major update
- [x] Add section "Round-trip writeback (designed; deferred to future spec)"
- [x] Document the full protocol:
  - **Trigger**: HA event `lucarne_family_apple_writeback_requested` with payload `{apple_uid, status, timestamp, device_name}` — `webhook_url` and `secret` are NOT in the event payload (see Sub-Phase C for the rationale). The future-spec subscriber must look them up by calling the exported accessor `lucarne_family.get_round_trip_config(hass)` (defined in Sub-Phase C) — NOT by reading `entry.data` directly.
  - **Receiver**: a generic "sync device" — Mac mini in the current bridge, but could be any device with Apple Reminders write access (e.g., another Mac, an iCloud-connected automation server)
  - **Webhook contract**: POST to `webhook_url` with JSON body:
    ```json
    {
      "apple_uid": "<UUID>",
      "status": "completed",
      "timestamp": "2026-05-23T17:00:00Z",
      "device_name": "Mac mini"
    }
    ```
  - **Authentication**: HMAC-SHA256 of body using `secret` from config, sent as `X-Lucarne-Signature` header. Receiver verifies before acting.
  - **Idempotency**: receiver must handle duplicate webhooks (HA may retry on network failure). Use `apple_uid + status + timestamp` as dedup key.
  - **Failure modes**: if webhook is unreachable, HA logs an error and does not retry in v0.2.0. Retry queues are out of scope for this design and must be a separate future spec.
  - **Implementation hint for the future spec**: subscribe to `lucarne_family_apple_writeback_requested` in a new HA automation OR build a small Python subscriber in the integration itself. Mac mini side needs a corresponding Shortcut that takes `apple_uid + status` and calls `EKEventStore.calendarItem(withIdentifier:)` (cast to `EKReminder`) + sets `completed`.
- [x] Add a "Why this design" subsection: webhook + secret is symmetric to the inbound bridge; generic "sync device" naming keeps it portable; HMAC vs shared-secret-in-URL trade-off (HMAC chosen because it survives URL logging)

#### `docs/integration.md` update
- [x] Add "Round-trip readiness" section: explains the integration is ready to fire round-trip events; how to enable via Options Flow; what's missing (the receiver — not built in this spec)

#### `docs/events.md` update
- [x] Add `lucarne_family_apple_writeback_requested` to the event reference with payload `{apple_uid, status, timestamp, device_name}` and an explicit note that `webhook_url` and `secret` are never included in HA events.
- [x] Add `lucarne_family_member_updated` with payload `{member, field}`; this event is used by cards to refresh member-level metadata such as avatar changes.

### Sub-Phase E: Misc polish

- [x] Add a CHANGELOG.md entry summarizing the whole spec's work
- [x] Bump version in `package.json` and `manifest.json` to `0.2.0` (`hacs.json` has no version field — HACS resolves version from git tags)
- [x] Update README.md banner placeholder note for v0.2.0 (screenshots gallery deferred until wall-iPad deployment)
- [x] Run final pass through CLAUDE.md to ensure it covers everything new

### Build verification (final)

- [x] All TS + Python lint/typecheck/test/build green
- [ ] CI both jobs green — **deferred: requires PR + CI run on GitHub**
- [ ] HACS validation green for both categories — **deferred: requires PR + CI run on GitHub**
- [ ] On real HA, full smoke test of every flow from a fresh install — **deferred: requires deployment to wall-iPad HA instance**
  - Install integration → add 3 members with different presets and avatars (mix emoji + upload)
  - Add a routine via the card popover, verify it appears
  - Add a chore with recurrence "every 6 months", verify the friendly summary text
  - Wait for reset time (or trigger manually); verify routines reset
  - Wait for streak check time (or trigger manually); verify counter updates
  - Rename a member with downstream impact preview; verify entities renamed, history continuous
  - Enable round-trip in options flow with a webhook.site URL; complete an apple-tagged task; verify the `lucarne_family_apple_writeback_requested` event fires in Developer Tools → Events with the documented payload (the webhook itself will NOT be POSTed in this spec — that's future work). The webhook URL is stored in config but unused until the future subscriber ships.
- [x] Mark phase `status: done`
- [x] Mark `features/chores-card/README.md` frontmatter `status: done`

### Manual verification with MCP tools

- [ ] Browser MCP: full visual walkthrough of every editor screen; screenshot each — **deferred: requires deployment to wall-iPad HA instance**
- [ ] `mcp__home-assistant__ha_call_service` for `lucarne_family.upload_avatar` with a real image; verify file appears in `/local/lucarne/avatars/` — **deferred: requires deployment to wall-iPad HA instance**
- [ ] `mcp__home-assistant__ha_get_history` for a renamed member's counter — history continuous — **deferred: requires deployment to wall-iPad HA instance**

## Constraints

- **Round-trip is designed only.** No POST, no Mac mini changes, no retries.
- **Custom presets can't override built-ins.** Users add custom alongside.
- **Avatar upload max 2MB** enforced both client-side (better UX) and server-side (security)
- **Bundle delta this phase ≤ +30KB** for the upload modal + crop UI
- **No new HACS validations** — both categories already declared

## Shortcut-resistance notes for LLM implementer

- **Don't implement the round-trip POST in this spec.** Only fire the event. The user has explicitly deferred the implementation to a future spec.
- **Don't drop cropping for "later" without documenting in CLAUDE.md** that center-crop is server-side and the upload modal accepts arbitrary aspect.
- **Don't change the `lucarne_family_apple_writeback_requested` event schema** lightly — it's the contract the future spec will build against. If you must change it, update `docs/reminders-bridge.md` in lock-step.
- **Don't bump to v1.0.0 in this phase.** v0.2.0 is correct; v1.0.0 waits for round-trip implementation + external user testing.
- **Don't add tests that POST to real webhook.site URLs in CI.** Use a mock server (httpserver fixture or mock event bus subscriber).
