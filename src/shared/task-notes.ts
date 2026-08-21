/**
 * A task's user-visible note.
 *
 * The Apple Reminders bridge stores its correlation id *inside* the todo item's
 * description as an `[apple:UUID]` sentinel, so a raw non-empty `description` is
 * not a usable "this task has a note" test — an imported reminder with no notes
 * of its own still carries one. Strip the sentinels and see what is left.
 *
 * Mirrors `APPLE_SENTINEL_RE` in
 * `custom_components/lucarne_family/apple_sentinel_backfill.py` — keep the two
 * in step, lowercase `apple:` prefix included.
 */
const APPLE_SENTINEL_RE = /\[apple:[^\]]+\]/g;

/** Description with Apple sentinels stripped; '' when nothing meaningful remains. */
export function taskNote(description: string | null | undefined): string {
  if (!description) return '';
  return description.replace(APPLE_SENTINEL_RE, '').trim();
}

/**
 * A URL inside a note, or the plain text between URLs.
 *
 * Only `http`/`https` (and bare `www.`, which is promoted to `https://`) ever
 * produce an `href` — a note is user content arriving from Apple Reminders via
 * the bridge, so a scheme like `javascript:` must never become a live link.
 */
export interface NoteSegment {
  /** The text to display, verbatim from the note. */
  text: string;
  /** Where to navigate, or null for a plain-text run. */
  href: string | null;
}

/**
 * Matches an absolute http(s) URL or a bare `www.` host. Deliberately stops at
 * whitespace and at the few characters that can only be markup or quoting, so
 * the run that follows a link ("… /list, then …") stays plain text.
 */
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/**
 * What survives trimming has to still be a URL: a scheme with at least one
 * character of host after it, or a `www.` host with a real label after the dot.
 */
const LINKABLE_RE = /^(?:https?:\/\/[^\s/?#]|www\.[^\s.])/i;

/** Trailing characters that end a sentence far more often than they end a URL. */
const TRAILING_PUNCTUATION = '.,;:!?';

const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function occurrences(text: string, ch: string): number {
  let n = 0;
  for (const c of text) if (c === ch) n++;
  return n;
}

/**
 * Drop trailing punctuation the writer meant as prose, not as part of the URL.
 * A closing bracket is kept when the URL opened it itself — Wikipedia-style
 * `…/Foo_(bar)` links are real — and dropped when it only closes text around
 * the link, as in `(see https://example.com/x)`.
 */
function trimTrailingPunctuation(url: string): string {
  let end = url.length;
  while (end > 0) {
    const ch = url[end - 1];
    if (TRAILING_PUNCTUATION.includes(ch)) {
      end--;
      continue;
    }
    const opener = CLOSERS[ch];
    if (opener) {
      const inside = url.slice(0, end - 1);
      if (occurrences(inside, ch) + 1 > occurrences(inside, opener)) {
        end--;
        continue;
      }
    }
    break;
  }
  return url.slice(0, end);
}

/**
 * Split a note into plain-text and link runs, ready to render.
 *
 * Concatenating every `text` reproduces the input exactly — the row's
 * accessible description and the collapsed one-line ellipsis both depend on
 * that, and so does anything comparing rendered text to the raw note.
 */
export function noteSegments(note: string): NoteSegment[] {
  const segments: NoteSegment[] = [];
  let cursor = 0;
  URL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_RE.exec(note)) !== null) {
    const raw = trimTrailingPunctuation(match[0]);
    // Trimming can eat everything that made the match a URL — "www..." leaves
    // "www", "https://..." leaves "https://". Linking those yields a RELATIVE
    // href that navigates the kiosk off the dashboard, so let the scanner move
    // past them as plain text.
    if (!LINKABLE_RE.test(raw)) {
      URL_RE.lastIndex = match.index + match[0].length;
      continue;
    }
    if (match.index > cursor) {
      segments.push({ text: note.slice(cursor, match.index), href: null });
    }
    segments.push({
      text: raw,
      href: raw.toLowerCase().startsWith('www.') ? `https://${raw}` : raw,
    });
    cursor = match.index + raw.length;
    URL_RE.lastIndex = cursor;
  }
  if (cursor < note.length) segments.push({ text: note.slice(cursor), href: null });
  return segments;
}
