---
status: pending
---

# Phase 5: Polish + HACS custom-repo publication

The "make it shine" phase. Responsive layout pass at all 4 breakpoints, README + screenshots + per-card config docs, hacs.json validation, GitHub tag `v0.1.0`, and a HA community forum post linking back to the threads the user originally found. End-state: another household can paste the repo URL into HACS, click around for an hour, and have a working DIY Skylight on their own iPad.

## Context

Read all prior phase files. Phase 5 depends on Phases 1–4 all `done`. The 3 cards are functional but probably need a polish round each. The repo has built artifacts but the README is a stub.

**Read before starting**:
- `~/src/home-assistant-things/ha-projects/device-monitor-card/README.md` — reference for what a published HACS card's README looks like (your own prior work, same style expected).
- `~/src/home-assistant-things/ha-projects/device-monitor-card/scripts/create-release.sh` — release tagging pattern.
- `~/src/home-assistant-things/ha-projects/device-monitor-card/hacs.json` — confirm our hacs.json matches structurally.

## Structure

```
~/src/home-assistant-things/ha-projects/ha-lucarne/
  README.md                                # FULL REWRITE: value-prop, screenshots, install, config, troubleshooting
  CHANGELOG.md                             # POPULATE: v0.0.1 → v0.1.0 entries
  docs/
    architecture.md                        # FINALIZE
    ipad-landscape.md                      # NEW: iPad 9 landscape sizing details + kiosk interactions
    reminders-bridge.md                    # ENRICH: troubleshooting, FAQ
    events.md                              # FINALIZE (created in Phase 4)
    config-recipes.md                      # NEW: per-household config examples
  img/
    today-card.png                         # NEW screenshots
    calendar-card.png
    chores-card.png
    full-dashboard.png
  scripts/
    create-release.sh                      # NEW: copy/adapt from device-monitor-card
  hacs.json                                # VERIFY against HACS validation
  src/                                     # tweak any final polish bits
  dist/                                    # rebuild for release

HA changes:
  Polish pass on /wall-ipad dashboard (kiosk_mode tweaks, default tab, etc.)
  No new entities or automations

Wiki:
  ~/src/Tower/home-automation/projects/ha-lucarne.md — final status: shipped
  ~/src/Tower/change-log.md — release entry
```

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task.

### Baseline Verification (before starting)

- [ ] Phases 1–4 all `status: done`. Cards live on iPad. Reminders bridge working.
- [ ] User has used the deployed system for at least 7 days. Collect their feedback: what feels rough, what surprised them, what Ingrid couldn't figure out, what the kids ignored. Capture in a temporary list to address during this phase.
- [x] `npm run lint && npm run typecheck && npm run build && npm test` — green.
- [ ] No HA log errors over the past 24h for any `lucarne_*` automation or entity.

### Sub-Phase A: Polish iteration based on user feedback

Goal: incorporate the 7-day-use feedback into actual fixes. This is the biggest "shine" lever.

#### A.1 Group feedback into actionable items

- [ ] Walk through the user's feedback list. For each item, classify:
  - **Visual polish** (size, color, spacing, hierarchy) — fix in card CSS
  - **Behavior bug** (something doesn't work as expected) — fix in card logic
  - **Missing feature** (small UX win) — fix if scope is < 1 hour; else defer to v0.2
  - **Won't fix** (out of scope or by design) — document in CHANGELOG / FAQ
- [ ] Surface the classification to the user. Get sign-off on what's in this phase vs. deferred.

#### A.2 Fix the in-scope items

- [ ] Implement each in-scope fix. Smallest change that addresses the feedback.
- [ ] After each fix: hard-refresh on the iPad. User confirms.
- [ ] Commit each fix as a separate small commit ("polish(today-card): bump time-pill font size for distance legibility", etc.) — easier to revert if a fix regresses.

### Sub-Phase B: Responsive layout pass at all breakpoints

Goal: cards look right on iPad 9 landscape (baseline) AND scale gracefully to larger displays the user might upgrade to.

#### B.1 Test at 4 widths

- [ ] In Safari on the MacBook, open the dashboard with viewport-width-override extensions OR simply resize the window. Test at:
  - ~700 px (iPad 9 portrait — verify graceful collapse, not a blocker)
  - ~1080 px (iPad 9 landscape — PRIMARY target, must be perfect)
  - ~1440 px (iPad Pro 11" landscape)
  - ~1366 px (iPad Pro 12.9" landscape)
- [ ] For each card, capture a screenshot at each breakpoint into `img/breakpoints/<card>-<width>.png`. Do NOT commit these — diagnostic only.

#### B.2 Fix responsive bugs

- [ ] Common bugs to check:
  - Text overflow / ellipsis at narrow widths
  - Card height too short at wide widths (event blocks crammed)
  - Tap targets too small at the high-DPI breakpoint
  - Gutters disappear at narrow widths
- [ ] Use CSS `clamp()` for typography. Use CSS Grid `auto-fit` / `auto-fill` over fixed columns where possible.
- [ ] After fixes, re-screenshot at all 4 breakpoints. Confirm visually.

#### B.3 Kiosk-mode interactions

- [ ] On the iPad as the `tablet` user, verify:
  - No HA chrome bleeds through any card
  - Sidebar stays hidden across tab switches
  - Tap-and-hold on a card doesn't trigger the HA more-info dialog when we don't want it to
- [ ] If the tablet user's kiosk-mode config needs tweaks, modify the `/wall-ipad` dashboard's `kiosk_mode:` block via `ha_config_set_dashboard`.

#### B.4 Default landing tab decision

- [ ] After the week of use, decide: should Family or Today (or Chores) be the default tab on landing?
  - Family is the planning surface (calendar-heavy) — adults' default.
  - Chores is the action surface — kids' default.
  - If they conflict, kids' wins (Family is one tap away for adults).
- [ ] Apply via the `kiosk_mode:` config: `default_path: /wall-ipad/family` (or whichever).
- [ ] Verify on the iPad after a reload.

### Sub-Phase C: Documentation — README + per-card configs + screenshots

Goal: another household can install and configure this without DM'ing the user. README is the public face.

#### C.1 Take screenshots

- [ ] iPad screenshots of:
  - Family tab full (with realistic data)
  - Chores tab full
  - Today card close-up
  - Calendar card close-up showing per-person colors + visibility pills
  - Chores card close-up
- [ ] On iPad: home + power = screenshot. Transfer to MacBook (AirDrop or iCloud).
- [ ] Crop to remove sensitive info (faces, exact addresses, specific events with personal context). Keep them realistic enough to demo.
- [ ] Save to `img/` in the repo. Names: `today-card.png`, `calendar-card.png`, `chores-card.png`, `full-dashboard.png`.

#### C.2 Rewrite README.md

Use this structure:

- [x] **Title** + tagline ("DIY Skylight Calendar for Home Assistant")
- [ ] **Hero screenshot** (full-dashboard.png) at the very top
- [x] **What it does** — 3-4 sentences. Lead with the user value.
- [x] **What it isn't** — "Not a HA integration; just custom Lovelace cards. Doesn't include the Reminders sync hardware — see [bridge/](./bridge) for that."
- [x] **Features** — bulleted list of 3 cards + Reminders bridge + chore automations
- [ ] **Screenshots** — gallery of per-card images with one-line descriptions (deferred: requires iPad capture; Screenshots section removed from README until img/ is committed)
- [x] **Install** — exactly 5 steps:
  1. HACS → Custom repositories → paste GitHub URL → type/category: Dashboard (backend/action category: `plugin`)
  2. Download Lucarne (HACS UI)
  3. Add `/hacsfiles/ha-lucarne/ha-lucarne.js` as a Lovelace resource
  4. Add the cards to your dashboard (YAML examples below)
  5. (Optional) Set up the Mac mini Reminders bridge (see [bridge/README.md](./bridge/README.md))
- [x] **Configuration** — per-card YAML config example with comments. Use the actual configs that ship on the user's dashboard as a starting point, sanitized.
- [x] **Blueprints** — link to `blueprints/automation/*`. Explain how to import.
- [x] **Events** — link to `docs/events.md`. Show an example consumer automation (TTS via HomePod when all chores done for a kid).
- [x] **Troubleshooting** — top 5 issues from the user's setup + answers (e.g. Mac mini sleeps, Shortcuts.app not launched, Google Calendar polling delay, kid taps wrong column, etc.)
- [x] **Roadmap** — v0.2 wishlist: round-trip Reminders, Mealie meal-plan integration, iOS Reminders → Groceries auto-add via Siri, support more weather providers, etc.
- [x] **Credits** — link to mohesles/my-skylight-calendar (single borrowed pattern), the community threads, Skylight (the product that inspired this).
- [x] **License** — MIT.

#### C.3 docs/ files

- [x] **`docs/architecture.md`** — finalize. Diagram (ASCII or mermaid) of: Mac mini → webhook → HA → todo entities → cards. Card subscription model. Design tokens layer.
- [x] **`docs/ipad-landscape.md`** — NEW. iPad 9 landscape pixel math (1080×810 after kiosk chrome), how cards adapt, larger-display behavior, known iPad-specific gotchas (HA Companion keyboard bug, kiosk Personal Automations dead-end — link to the existing wiki page).
- [x] **`docs/reminders-bridge.md`** — already exists from Phase 1; enrich with troubleshooting FAQ:
  - "Reminders not syncing" → check `launchctl list | grep lucarne`, check `~/Library/Logs/ha-lucarne-sync.log`, check Shortcuts.app launched
  - "Items appear duplicated" → check that the blueprint is using `uid` matching, not `summary`
  - "Items completed in HA reappear" → expected in v1; v0.2 round-trip will fix
- [x] **`docs/events.md`** — finalize from Phase 4
- [x] **`docs/config-recipes.md`** — NEW. Per-household recipes:
  - 2-adult, no-kids household (skip chores card, use today + calendar only)
  - Large family (5+ kids — show how to extend the chores card)
  - Apartment without a Mac (skip Reminders bridge, use HA todo directly via iOS Companion)

#### C.4 bridge/README.md

- [x] Finalize Mac mini install steps from Phase 1 C.4. Add:
  - Adapting to fewer/more lists (modify Shortcut, update blueprint instance)
  - Adapting to non-shared lists (drop assignee filter)
  - Troubleshooting matrix

### Sub-Phase D: HACS validation + release tag

#### D.1 HACS validation

- [x] Verify `hacs.json` matches HACS frontend-category requirements AND matches the project precedent at `~/src/home-assistant-things/ha-projects/device-monitor-card/hacs.json`:
  ```json
  {
    "name": "Lucarne",
    "render_readme": true,
    "filename": "ha-lucarne.js",
    "content_in_root": false,
    "homeassistant": "2024.1.0"
  }
  ```
  (Do not add `zip_release: false` — the precedent file omits it.)
- [x] Run HACS validation locally via the official action. Add `.github/workflows/hacs.yml`:
  ```yaml
  name: HACS Validation
  on:
    push:
    pull_request:
  jobs:
    hacs:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: hacs/action@main
          with:
            category: plugin
  ```
- [ ] Push. GitHub Actions runs the validation. Must be green.
- [ ] If validation fails, fix per the action's error messages (commonly: missing README sections, info.md required, dist/ missing).

#### D.2 Final build

- [x] `npm run lint && npm run typecheck && npm run test && npm run build`. All green.
- [x] Inspect `dist/ha-lucarne.js`. Bundle size should be ≤ 300 KB minified.
- [ ] Commit and push everything. CI green.

#### D.3 Release tag

- [x] Copy `device-monitor-card/scripts/create-release.sh` to `ha-lucarne/scripts/create-release.sh`. Adapt the script's repo name + version-bump logic.
- [x] Update `package.json` version to `0.1.0`.
- [x] Update `CHANGELOG.md` with a `## v0.1.0 — Initial release` section summarizing what's in v1 (the 3 cards, the Reminders bridge, the 2 blueprints, the `ha_lucarne_chores_all_done` event).
- [ ] Commit: `git commit -am "Release v0.1.0"`. Push.
- [ ] Tag: `git tag -a v0.1.0 -m "v0.1.0 — Initial release"` then `git push origin v0.1.0`.
- [ ] Create a GitHub release from the tag via `gh release create v0.1.0 --title "v0.1.0 — Initial release" --notes-file <changelog-section>`. Attach `dist/ha-lucarne.js` as a release asset (optional; HACS reads from the `filename` in hacs.json).

#### D.4 Swap dashboard resource URL to the HACS-managed path

> Phases 2–4 used the dev URL `/local/lucarne/ha-lucarne.js`. After HACS installation on the user's HA, the canonical path becomes `/hacsfiles/ha-lucarne/ha-lucarne.js`. The two paths CAN coexist briefly during cut-over, but leaving both creates two registrations and undefined behavior.

- [ ] Tell the user to install the repo via HACS on their actual HA (Settings → HACS → Custom repositories → add `https://github.com/molant/ha-lucarne` → Type/Category: Dashboard; backend/action category is `plugin` → Download).
- [ ] HA → Settings → Dashboards → kebab → Resources. Add `/hacsfiles/ha-lucarne/ha-lucarne.js` as JavaScript Module. Then REMOVE the older `/local/lucarne/ha-lucarne.js` entry. Wait for confirmation.
- [ ] Tell the user to delete the leftover file at `<config>/www/lucarne/ha-lucarne.js` (Samba/File Editor). Skipping this leaves an orphan that can shadow the HACS install after browser cache invalidates.
- [ ] Hard-refresh the iPad. Verify the dashboard still renders all three custom cards. If any card shows "Custom element not defined", the resource registration is wrong — fix before continuing.

#### D.5 Install verification on a clean HA instance (optional but recommended)

- [ ] On a separate HA dev instance (or in a docker test container), add the repo as a HACS custom repository, install, configure the cards with stub configs, verify they render and don't crash.
- [ ] If issues found, hotfix as `v0.1.1`.

### Sub-Phase E: Community + wiki finalize

#### E.1 HA community forum post

- [x] Write a post linking back to the threads the user originally found (Skylight DIY thread, XDA article, mohesles repo). Title: "ha-lucarne — DIY Skylight Calendar for HA (custom cards + Reminders sync)".
- [x] Include: screenshots, repo link, what's different from mohesles + others (per-person color, multi-list Reminders bridge, chores card, designed Lit cards), HACS custom-repo install instructions, v0.2 roadmap.
- [x] Draft provided at `docs/community-post.md`. **User action required**: fill in community thread URLs and add screenshots before posting. Draft carries a DO NOT POST warning until those TODOs are resolved.

#### E.2 HACS default index submission (DEFERRED to v0.2)

- [x] Per user's direction, do NOT submit to HACS default index in v0.1. The custom-repo install path is the v1 distribution model. Submit later after v1 has stabilized in user's home for ≥ 1 month and the README has been validated by at least one external installer.
- [x] Add a note in `README.md`'s Install section: "HACS default index submission is planned for v0.2 once the install flow has been validated externally."

#### E.3 Wiki finalize

- [x] Update `~/src/Tower/home-automation/projects/ha-lucarne.md` to status "shipped — v0.1.0". Add link to GitHub release. (Updated `projects.md` — no separate page existed)
- [x] Append `~/src/Tower/change-log.md`: "ha-lucarne v0.1.0 shipped. Public HACS-installable. Wife approves."
- [x] Update `~/src/Tower/home-automation/dashboards/wall-ipad.md` to reflect final tab order, default tab decision, and link to the project page.

### Build Verification (required before marking phase complete)

- [ ] `npm run lint && npm run typecheck && npm run test && npm run build` — green.
- [ ] HACS validation GitHub Action — green.
- [ ] `dist/ha-lucarne.js` < 300 KB.
- [ ] GitHub release `v0.1.0` exists with notes + assets.
- [ ] README renders correctly on GitHub (preview).
- [ ] No HA log errors over the past 24h.
- [ ] Mark phase `status: done`.

### Manual Verification (final wife-test)

- [ ] **Ingrid uses the system for a week with no complaints**. If complaints arise: triage them, fix the blockers, defer the nice-to-haves.
- [ ] **Each kid uses the chores tab independently for a week**. Reset works, streak advances, animation plays.
- [ ] **A non-household friend installs from the README** (low priority but ideal): they can get a working install in ≤ 1 hour. Capture their pain points and append to README.

## Technical Details

### HACS frontend-category requirements (verified at time of writing)

- A README.md at root
- GitHub repository description and topics set before release
- A `hacs.json` with `filename` set
- A built JS file at the configured `filename`
- Either `content_in_root: false` (and `dist/` contains the file) or `content_in_root: true` (and root contains the file). We use the former.
- Tagged release. HACS pulls the asset at the configured filename from the latest tag.

If HACS validation finds new requirements (the spec evolves), fix per the action's error messages.

### Version numbering

- v0.x while we're iterating with the user and not yet in HACS default index.
- v1.0 reserved for HACS default index submission + the round-trip Reminders feature (v0.2 if standalone, bundled into v1.0).

## Constraints

- No HACS install of OTHER cards in this phase. We are publishing OUR card; we don't take a dependency on others mid-publication.
- No breaking config changes from previous phases without bumping the major version (we're at 0.x, so breaking changes are allowed but should be documented in CHANGELOG).
- All screenshots must be sanitized (no real faces, no exact addresses, no specific personal events).
- The HA community forum post is the USER's content — do not auto-post; provide a draft.
- HACS default index submission is OUT of scope for this phase.
