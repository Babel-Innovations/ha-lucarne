---
status: done
---

# Phase 2: Event dialog UX (iPad rendering fixes)

Pure-CSS phase. Touches one file: `src/components/create-event-popover.ts`. Fixes issues 1 (oversized native date/time inputs on iPad) and 2 (solid-black unchecked checkbox on iPad).

## Context

Read [./README.md](./README.md) for the bug catalog and root-cause analysis.

The New-Event dialog uses native `<input type="date">`, `<input type="time">`, and `<input type="checkbox">` elements. On Chrome desktop they render fine. On iPad iOS Safari:

- Date and time inputs render as oversized "fat pill" button-like controls (iOS's native styling), much taller and visually heavier than the surrounding text inputs.
- The all-day checkbox renders solid black when unchecked because iOS Safari falls back to the page foreground color (`var(--lucarne-on-surface)` ≈ `#3a3a3a`) for the box when no `accent-color` is set.

The fix is CSS-only: native-chrome stripping on the date/time inputs (`appearance: none` + WebKit shim) and a fully custom-rendered all-day checkbox (`appearance: none` + themed border + `::after` checkmark). No behavior changes.

> **Post-implementation note (2026-05-23)**: the initial 2B attempt used `accent-color: var(--primary-color)`, but on both iPad iOS Safari and Chrome with the lucarne light theme the checkbox still rendered with a near-black fill or solid border. The shipped implementation is the custom-checkbox approach originally outlined as the optional Sub-Phase 2C; 2B and 2C are merged below.

## Structure

```
src/components/
  create-event-popover.ts        # MODIFY: strip native input chrome (date/time); replace native checkbox rendering with a custom border + ::after checkmark
```

No new files. No new tests (pure visual fix; manual verification via browsermcp screenshots).

## Implementation Checklist

> **Remember**: Update these checkboxes as you complete each task!

### Baseline verification

- [ ] On a fresh build, open the New-Event dialog on the wall iPad. Take a `mcp__browsermcp__browser_screenshot` of the dialog as the BEFORE reference.
- [ ] On Chrome desktop, take a matching BEFORE screenshot (should already look correct — confirms Chrome regression check).

### Sub-Phase 2A: Strip iOS native input chrome (issue 1)

Deployable when: date/time inputs on iPad visually match the text inputs (same height, same border-radius, same left-aligned text).

#### Implementation

- [x] Edit `src/components/create-event-popover.ts`, in the shared input rule at lines 93-108. Add `appearance: none; -webkit-appearance: none;` and `text-align: left;`:

  ```css
  input[type='text'],
  input[type='date'],
  input[type='time'],
  select,
  textarea {
    appearance: none;
    -webkit-appearance: none;
    text-align: left;
    width: 100%;
    box-sizing: border-box;
    /* ...rest of existing rules unchanged... */
  }
  ```

- [x] After the shared rule, add WebKit-specific rules to neutralize the iOS date/time inner pieces:

  ```css
  input[type='date']::-webkit-date-and-time-value,
  input[type='time']::-webkit-date-and-time-value {
    text-align: left;
  }
  input[type='date']::-webkit-calendar-picker-indicator,
  input[type='time']::-webkit-calendar-picker-indicator {
    opacity: 0.6;
  }
  ```

  These pseudo-elements only exist on WebKit-based browsers (iOS Safari, desktop Safari, Chromium); on other engines the selectors are silently ignored.

#### Manual verification (2A)

- [ ] Rebuild and deploy (`npm run deploy`).
- [ ] On iPad: open New-Event dialog. Date field is now a single rectangle the same height as the Title input, with `May 26, 2026` left-aligned (or whatever date format iOS shows when stripped of native chrome).
- [ ] Tap the Date field → the native iOS date picker still pops up. Pick a date → returns to the dialog with the new date displayed in the left-aligned field.
- [ ] Same checks for Start and End fields.
- [ ] On Chrome desktop: dialog still looks correct (no regression — the rule was already correct, just adds explicit `appearance: none` which Chrome ignores for these types).
- [ ] Take AFTER screenshots on both devices for the PR description.

### Sub-Phase 2B: Custom-styled all-day checkbox (issue 2)

> **Note (post-implementation, 2026-05-23)**: The initial implementation used
> `accent-color: var(--primary-color)`, but the user confirmed it still
> rendered solid black on iPad and produced a dark fill on Chrome with the
> lucarne light theme — the "no fill" UX wasn't achievable via `accent-color`.
> The shipped implementation is the custom-checkbox approach (formerly
> Sub-Phase 2C, now folded in here). The original `accent-color` rule is
> preserved in this section's history for context but is NOT what the code does.

Deployable when: the unchecked all-day checkbox shows a themed border (not solid black or filled) on iPad AND Chrome.

#### Implementation (shipped)

- [x] Edit `src/components/create-event-popover.ts`, in the checkbox rule. Strip native chrome and render the checkmark with CSS:

  ```css
  .allday-row input[type='checkbox'] {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    min-height: unset;
    margin: 0;
    cursor: pointer;
    border: 2px solid var(--primary-color, #03a9f4);
    border-radius: 3px;
    background: transparent;
    position: relative;
    flex-shrink: 0;
  }
  .allday-row input[type='checkbox']:checked::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0;
    width: 4px;
    height: 9px;
    border: solid var(--primary-color, #03a9f4);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .allday-row input[type='checkbox']:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
  }
  ```

  Border + checkmark both use `var(--primary-color)` (resolves to the lucarne theme's `#a8c5e8` when the theme is active). No fill in either state — reads correctly in light themes. Native `<input>` element is preserved for keyboard accessibility (Tab to focus, Space to toggle).

#### Manual verification (2B)

- [ ] Rebuild and deploy.
- [ ] On iPad with the lucarne theme: open New-Event dialog. The unchecked all-day checkbox has a themed border (no fill).
- [ ] Tap the checkbox → the themed checkmark appears inside the box; still no fill.
- [ ] On Chrome desktop: same rendering as iPad.
- [ ] Tab to focus → `:focus-visible` outline appears; Space toggles the checkbox.

### Final verification

- [x] All four gates green:
  - [x] `npm run typecheck`
  - [x] `npm run lint`
  - [x] `npm test`
  - [x] `npm run build`
- [ ] Side-by-side BEFORE/AFTER screenshots on iPad attached to the commit message or PR description.
- [ ] Commit message format: `fix(calendar-polish): Phase 2 — iPad date/time input + checkbox styling`.

## Out of scope for this phase

- Phase 1 (pan fixes) and Phase 3 (delete events). Each is its own deployable phase.
- Re-theming the entire create-event-popover (only the two specific rules above).
- Replacing native inputs with custom HA components (`ha-textfield`, `ha-selector`, etc.) — the repo deliberately uses raw HTML inputs throughout; do not change that convention.
