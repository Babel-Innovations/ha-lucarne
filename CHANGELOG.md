# Changelog

## v1.5.0 — 2026-08-25

**Features:**
-  show task notes and keep completed tasks crossed out
-  add create-prerelease.sh + delete-prerelease.sh

**Fixes:**
-  serialize task metadata inserts against delete_task
-  import the card bundle after HA replaces the element registry
-  let write services act on todo items with no metadata row
-  pin the day-name and all-day rows while the grid scrolls
-  tag pre-releases with the next version, not the stored one
-  pin browser target so cards parse on iPadOS 15 / Tizen (fixes #101)


## v1.4.3 — 2026-06-12

**Fixes:**
-  honor RRULE for routine visibility


## v1.4.2 — 2026-06-11

**Fixes:**
-  honor RRULE for routine visibility and reset household routines


## v1.4.1 — 2026-06-11

**Fixes:**
-  relay family events via WS command for non-admin clients


## v1.4.0 — 2026-06-10

**Features:**
-  extend optimistic UI to Today-card toggle and chores-card edit

**Fixes:**
-  coalesce in-flight family refreshes and back off the poll when no integration
-  optimistically hide deleted tasks so the kiosk row doesn't linger
-  auto-refresh family state so kiosk sees changes from other devices


## v1.3.0 — 2026-06-10

**Features:**
-  multi-person routines and rotating tasks

**Fixes:**
-  keep edit popover open after long-press on iPad
-  keep today's past calendar events visible (dimmed)
-  exclude rotating tasks from the Today card
-  optimistically render newly-added tasks
-  defer column auto-scroll to rAF so it lands after rows render (#68)
-  auto-scroll columns to current time-of-day section (fixes #68)
-  refresh due-today window at local midnight (#68)
-  wrap long task text instead of horizontal scroll (fixes #69)


## v1.2.0 — 2026-06-06

**Features:**
-  auto-scroll to current time + follow as time advances (fixes #58)

**Fixes:**
-  instant toggle feedback + clear completed one-off chores at reset
-  correct throttle fallback + listener cleanup
-  add error boundary + remote crash reporter for iPad


## v1.1.1 — 2026-05-30

**Fixes:**
-  sort keys per hassfest (domain, name, then alphabetical)
-  satisfy hassfest manifest + translation rules


## v1.1.0 — 2026-05-29

**Features:**
-  shared constant fill-height for today + calendar (#38)
-  task priority sort, configurable limit, refill toggle (#38)
-  agenda shows today only, tomorrow opt-in, scrolls (#38)
-  add icons to time-of-day separators (#36)
-  auto-register bundled Lucarne theme at startup

**Fixes:**
-  equalize today + calendar height via fixed outer height (#38)
-  robust slot burn + clamp max_tasks (PR #39 review)
-  style unchecked checkboxes from theme tokens (#36)
-  validate tokens and don't clobber user theme


> **Release flow.** Versions are not bumped by hand. `scripts/create-release.sh`
> reads commits since the last `bump:` commit / `vX.Y.Z` tag, infers the bump
> type (`feat:` → minor, `fix:` → patch, `breaking:` → major), updates
> `package.json` + `CHANGELOG.md`, rebuilds `dist/`, tags, and publishes. So
> `package.json` always reflects the **last released** version, not the
> in-progress one — the `[Unreleased] — targeting vX.Y.Z` heading below is
> only an intent marker, and the script may pick a different version if the
> commit mix shifts before release.

## [Unreleased] — targeting v0.2.0

### Added

- `lucarne_family` integration: the bundled **Lucarne** pastel theme is now registered automatically at startup (in-process via `hass.data[DATA_THEMES]`) — it appears under **Profile → Theme → Lucarne** with no `configuration.yaml` edits or manual file copy. The theme YAML moved into the package at `custom_components/lucarne_family/themes/lucarne.yaml` so HACS ships it. A manual `frontend.reload_themes` drops it until the next restart; copy the file into `<config>/themes/` to make it permanent.
- `lucarne-today-card` — optional `household_tasks_from_integration: true` flag: reads household tasks from the `lucarne_family` integration (`todo.lucarne_household`) instead of a raw `tasks:` entity; renders task metadata (icon, due date) for richer display.
- `lucarne-today-card` — optional `show_family_ready_pill: true` flag: shows a compact N/M pill in the card header indicating how many members have completed all their routines due today.
- New `family-ready-pill` Lit component: computes readiness by filtering routines due today via the RRULE engine (not the streak counter, which can be stale until `streak_check_time`).
- `CLAUDE.md` at repo root: working guide for AI sessions and new contributors — commands, deploy targets, test-runner conventions, pitfalls.
- `lucarne_family` integration: `perform_daily_reset` and `evaluate_all_streaks` services are now callable from Developer Tools → Services for on-demand reset and streak recompute.
- Design tokens `--lucarne-success-bg` and `--lucarne-success-fg` for the family-ready pill.

- `lucarne-calendar-card` — horizontal touch swipe with snap-to-day, flick-velocity bias, and iOS-like 240 ms snap-back easing. Uses Pointer Events for unified mouse/pen/finger support.
- `lucarne-calendar-card` — skeleton-column placeholder for uncached days: a shimmer animation appears while events are loading, replaced by real events once the fetch completes. Shimmer degrades to a static placeholder under `prefers-reduced-motion: reduce`.
- `lucarne-calendar-card` — editor options `min_days`, `max_days`, `min_col_width`, `max_col_width` for the responsive visible-day-count algorithm.
- `lucarne-calendar-card` — off-screen render-buffer days (config option `render_buffer_days`, defaults to `visibleCount`) so the user no longer sees a blank gap during a swipe-pan; off-screen days slide into view as the gesture progresses.
- `lucarne-calendar-card` — Delete button (with inline "Confirm delete?" step) in the event-detail modal for calendars whose entity reports `CalendarEntityFeature.DELETE_EVENT`; optimistic removal with tombstones that survive transient per-entity fetch failures.
- `lucarne-calendar-card` — synthetic UID generation (`syn:start|end|summary`) for upstream events with no `uid`, preventing collisions across color lookup, allDayClipped keying, and the optimistic-delete tombstone filter.
- `lucarne-chores-card` — avatar-upload modal (`avatar-upload-modal` component): emoji grid (40 common avatars) or PNG/JPEG/WebP upload (≤ 2 MB); wired into the chores-card editor member picker with a "Change" button per row.
- `lucarne_family.set_member_avatar` service — sets a member's avatar to an emoji or `/local/lucarne/avatars/<file>` path without re-uploading; fires `lucarne_family_member_updated` so subscribed cards refresh immediately.
- Round-trip writeback readiness: when an apple-sourced task with a non-empty `apple_uid` completes and `round_trip.enabled == true`, the integration fires `lucarne_family_apple_writeback_requested` (`{apple_uid, status, timestamp, device_name}`). No HTTP request is made in v0.2 — the event is the designed-for contract; the POST is deferred to a future spec.
- `get_round_trip_config(hass)` — typed `RoundTripConfig` accessor for future round-trip subscribers; abstracts `entry.data` so storage layout changes don't break downstream code.
- Custom routine presets: add new presets (name + routine templates with icon + RRULE) via Options Flow → "Routine presets" → "Add a custom preset"; stored in `entry.data["custom_presets"]` and merged with built-in presets at presentation time.
- `lucarne_family_member_updated` event: fired by `set_member_avatar`; `family-subscription.ts` subscribes so avatar changes appear in cards without a dashboard reload.
- `docs/reminders-bridge.md` — round-trip writeback protocol section: full webhook contract, HMAC-SHA256 signing, idempotency requirements, `get_round_trip_config` accessor contract, and future-spec implementation guide.

### Changed

- `README.md` — complete rewrite of Install and Configuration sections for dual HACS distribution (Frontend plugin + Integration); added "What does the integration do?" and "Family configuration" subsections; updated chores card config example to new schema; removed `Settings → Helpers` instructions for the now-retired `input_boolean` approach.
- `docs/architecture.md`, `docs/integration.md`, `docs/services.md`, `docs/events.md` — finalized to reflect Phase 2–5 implementation; added migration table, Phase 6 planned events, corrected managed-automation model (in-process `async_track_time_change`, no `automation.*` HA entities).
- `bridge/README.md` — updated entity name examples to integration-managed `todo.<slug>` / `todo.lucarne_household` pattern; added "When using the Lucarne Family integration" section.

- `lucarne-calendar-card` — now uses a rolling N-day window anchored on today (replaces fixed Monday-anchored week). Column count adapts to container width. Navigation arrows step by `visibleCount` days; a "Today" button re-anchors when panned away.
- `lucarne-calendar-card` — layout engine refactored to accept arbitrary day arrays (foundation for rolling-window).
- `lucarne-calendar-card` — New-Event dialog inputs: iPad iOS Safari `<input type="date"|"time">` no longer rendered as oversized "fat pill" controls; all-day checkbox now renders with a themed border + custom `::after` checkmark (no fill) on both iPad and Chrome.
- `lucarne-calendar-card` — pan/snap interaction: `setPointerCapture` deferred to the 10px drag threshold (fixes Chrome desktop clicks on event pills not opening the detail modal); snap animation animates the OLD content to the next-day position and atomically swaps to NEW content on `transitionend` (eliminates the visible "jump" users reported).
- `fetchCalendarEvents` returns `{ events, failed }` (new `FetchCalendarEventsResult`) so callers can distinguish a really-empty result from a per-entity fetch failure.
- Chores-card editor — member rows show current avatar + "Change" button; clicking opens the avatar-upload modal. Avatar edits go through integration services (`set_member_avatar` / `upload_avatar`), not card YAML.
- `family-subscription.ts` — `get_family` WebSocket command re-triggered on `lucarne_family_member_updated` and `lucarne_family_avatar_uploaded` so avatar changes appear without a dashboard reload.
- Options Flow — new "Apple Reminders sync" step with fields for `enabled`, `webhook_url`, `secret`, and `device_name`; config stored in `entry.data["round_trip"]`.

### Deprecated

- `lucarne-calendar-card` — `week_starts_on` config option is silently ignored — the rolling window has no week start. The field is still accepted in YAML so old configs load without errors.

### Fixed

- `lucarne-calendar-card` — event-detail modal: header is now a 4-cell grid (dot · title · 🗑️ · ✕) so the title and close button sit on the same baseline; the bottom "Delete" button moves into the header as a 🗑️ icon with an inline "Tap 🗑️ again to delete" confirm pill; detail rows use a larger font. The non-functional "Open in Google Calendar" link was removed — it 404'd in practice and added no value in the wall-iPad context (issue #2).
- `lucarne-calendar-card` — all-day events no longer paint over the hour-column gutter while the user swipes between days on iPad Safari. The row-2 (all-day) day-columns track is now wrapped in a column-2-scoped `overflow: hidden` clip so the transformed track cannot bleed across the gutter regardless of sticky/transform stacking quirks. Rows 1 (day headers, `position: sticky`) and 3 (which hosts `<lucarne-out-of-band-stub>` with `position: fixed` overlays) are intentionally not wrapped, since clipping them would re-parent the sticky scrollport or cut off the fixed overlay (issue #3).

## v0.1.0 — Initial release

Three custom Lovelace cards, an Apple Reminders sync bridge, and three automation blueprints — all
packaged as a HACS custom-repository plugin. The `lucarne-calendar-card` in this release was a
**fixed Monday-anchored week view**; the rolling N-day window and swipe gestures arrive in v0.2.0
(see Unreleased above).

**Cards**
- `lucarne-today-card` — 7-day agenda strip, today's weather + tomorrow's forecast, task-count
  badge, presence pills; visual editor included
- `lucarne-calendar-card` — fixed 7-day week-view grid with per-person color coding, visibility
  toggle pills, event-detail popover, create-event flow; visual editor included. (Replaced by the
  rolling N-day window in 0.2.0.)
- `lucarne-chores-card` — per-kid chore columns backed by `input_boolean` helpers, streak counter
  via `counter.*` helpers, celebration animation, `ha_lucarne_chores_all_done` custom event;
  visual editor included

**Bridge**
- Mac mini Shortcuts.app + launchd bridge syncs Apple Reminders to HA `local_todo` entities
  every 5 minutes, with deduplication by Apple Reminder UID

**Blueprints**
- `lucarne_reminders_sync` — webhook receiver; upserts Apple Reminders payload into HA `local_todo`
  entities, deduplicated by Apple Reminder UID; configured with `list_mappings` JSON input
- `lucarne_chores_daily_reset` — midnight reset of all chore `input_boolean` entities
- `lucarne_chores_streak_advance` — nightly streak check at 21:00; increments or resets
  `counter.*` helpers

**Events**
- `ha_lucarne_chores_all_done` — fired when a kid completes all their chores; carries `kid_slug`,
  `kid_name`, `date`, `chores_completed`, `streak` — locked API in v1

**Design**
- CSS design-token layer (`clamp()`-based typography, spacing, palette custom properties)
- Responsive at 700 / 1080 / 1366 / 1440 px breakpoints
- iPad 9 landscape (1080×810 CSS px) primary target; tested in kiosk mode

## v0.0.1 — Project scaffolded

Initial repo scaffold with Lit + Vite + TypeScript and a placeholder `lucarne-today-card` element.
