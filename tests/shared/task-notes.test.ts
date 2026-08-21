import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { noteSegments, taskNote } from '../../src/shared/task-notes.js';

describe('taskNote', () => {
  it('returns a plain description unchanged', () => {
    assert.equal(taskNote('Fold into the top drawer'), 'Fold into the top drawer');
  });

  it('returns empty for a description that is only an Apple sentinel', () => {
    assert.equal(taskNote('[apple:1F2E3D4C-5B6A-7988-A1B2-C3D4E5F60718]'), '');
  });

  it('strips a sentinel and keeps the surrounding note', () => {
    assert.equal(taskNote('[apple:ABC-123] Fold into the top drawer'), 'Fold into the top drawer');
    assert.equal(taskNote('Fold into the top drawer [apple:ABC-123]'), 'Fold into the top drawer');
  });

  it('strips every sentinel when more than one is present', () => {
    assert.equal(taskNote('[apple:one]Socks in the bin[apple:two]'), 'Socks in the bin');
  });

  it('leaves a non-sentinel bracketed string alone', () => {
    assert.equal(taskNote('[urgent] call the plumber'), '[urgent] call the plumber');
    assert.equal(taskNote('[APPLE:ABC] shout'), '[APPLE:ABC] shout');
  });

  it('treats whitespace-only and missing descriptions as no note', () => {
    assert.equal(taskNote(''), '');
    assert.equal(taskNote('   \n  '), '');
    assert.equal(taskNote('  [apple:ABC]  '), '');
    assert.equal(taskNote(null), '');
    assert.equal(taskNote(undefined), '');
  });
});

describe('noteSegments', () => {
  const text = (note: string) =>
    noteSegments(note)
      .map((s) => s.text)
      .join('');

  it('returns a single plain segment when there is no link', () => {
    assert.deepEqual(noteSegments('Fold into the top drawer'), [
      { text: 'Fold into the top drawer', href: null },
    ]);
  });

  it('returns nothing for an empty note', () => {
    assert.deepEqual(noteSegments(''), []);
  });

  it('splits an http(s) URL out of the surrounding text', () => {
    assert.deepEqual(noteSegments('Policy at https://my.lgamerica.com/account/policies/list today'), [
      { text: 'Policy at ', href: null },
      {
        text: 'https://my.lgamerica.com/account/policies/list',
        href: 'https://my.lgamerica.com/account/policies/list',
      },
      { text: ' today', href: null },
    ]);
  });

  it('promotes a bare www host to https', () => {
    assert.deepEqual(noteSegments('www.example.com'), [
      { text: 'www.example.com', href: 'https://www.example.com' },
    ]);
  });

  it('links every URL in a note with more than one', () => {
    const segments = noteSegments('a http://one.example b https://two.example c');
    assert.deepEqual(
      segments.filter((s) => s.href).map((s) => s.href),
      ['http://one.example', 'https://two.example'],
    );
    assert.equal(text('a http://one.example b https://two.example c'), 'a http://one.example b https://two.example c');
  });

  it('never links a scheme other than http(s)', () => {
    // A note is user content arriving from Apple Reminders; a javascript: or
    // data: URL must stay inert text.
    for (const note of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'mailto:a@b.co']) {
      assert.deepEqual(noteSegments(note), [{ text: note, href: null }], note);
    }
  });

  it('leaves sentence punctuation outside the link', () => {
    assert.deepEqual(noteSegments('See https://example.com/x.'), [
      { text: 'See ', href: null },
      { text: 'https://example.com/x', href: 'https://example.com/x' },
      { text: '.', href: null },
    ]);
    assert.deepEqual(noteSegments('(see https://example.com/x)'), [
      { text: '(see ', href: null },
      { text: 'https://example.com/x', href: 'https://example.com/x' },
      { text: ')', href: null },
    ]);
  });

  it('keeps a closing bracket the URL opened itself', () => {
    assert.deepEqual(noteSegments('https://en.wikipedia.org/wiki/Foo_(bar)'), [
      {
        text: 'https://en.wikipedia.org/wiki/Foo_(bar)',
        href: 'https://en.wikipedia.org/wiki/Foo_(bar)',
      },
    ]);
  });

  it('does not link a match that trimming reduced to a bare scheme or host', () => {
    // Trimming eats what made these URLs: linking the remainder produces a
    // RELATIVE href ("www", "https://") that navigates the kiosk off the
    // dashboard when tapped.
    for (const note of ['www...', 'hmm www....', 'go to https://... now', 'www.', 'https://']) {
      assert.deepEqual(
        noteSegments(note).filter((s) => s.href),
        [],
        note,
      );
      assert.equal(text(note), note, note);
    }
  });

  it('reproduces the note exactly when the segments are concatenated', () => {
    // The row's accessible description and its collapsed one-line ellipsis both
    // read the rendered text, so no character may be dropped or added.
    for (const note of [
      'Plain note',
      'Policy https://my.lgamerica.com/account/policies/list, then call',
      'Ends with a link https://example.com/x.',
      'https://example.com/x starts with one',
      'www.example.com and https://two.example/y!',
      'hmm www.... and https://... too',
    ]) {
      assert.equal(text(note), note, note);
    }
  });
});
