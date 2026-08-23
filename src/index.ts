// MUST stay first. ESM evaluates imports depth-first in source order, so this
// side-effect import arms window.onerror before any card module is evaluated —
// see src/shared/install-reporter.ts for why the previous arrangement (a plain
// call in this file's body) ran dead last instead. Issue #101.
import './shared/install-reporter.js';

import './cards/lucarne-today-card';
import './editors/lucarne-today-card-editor';
import './cards/lucarne-calendar-card';
import './editors/lucarne-calendar-card-editor';
import './cards/lucarne-chores-card';
import './editors/lucarne-chores-card-editor';

import { markBoot } from './shared/boot-marks.js';

// Last statement in the bundle: its presence in window.__lucarneBoot.marks is
// the only proof that evaluation ran to completion rather than aborting late.
markBoot('bundle-complete');
