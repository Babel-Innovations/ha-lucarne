import { installGlobalErrorReporter } from './shared/error-reporter.js';

// Capture uncaught Lucarne errors (incl. throws inside child components) so they
// can be surfaced to Home Assistant for remote debugging on the wall iPad.
installGlobalErrorReporter();

import './cards/lucarne-today-card';
import './editors/lucarne-today-card-editor';
import './cards/lucarne-calendar-card';
import './editors/lucarne-calendar-card-editor';
import './cards/lucarne-chores-card';
import './editors/lucarne-chores-card-editor';
