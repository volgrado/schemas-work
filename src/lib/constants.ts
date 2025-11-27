/**
 * @file constants.ts
 * @module constants
 * @description
 * Defines immutable, application-wide constants.
 * This acts as the "source of truth" for configuration values, storage keys,
 * and magic numbers, ensuring consistency and preventing typos across the codebase.
 */

// --- Persistence Keys (LocalStorage / IndexedDB) ---
export const ERROR_LOGS_STORAGE_KEY = 'schemas-work-error-logs';
export const IDENTITY_STORAGE_KEY = 'schemas-work-identity';
export const DIRECTORY_STORAGE_KEY = 'schemas-work-directory';
export const LAST_ACTIVE_DOC_KEY = 'schemas-work-last-active';
export const THEME_STORAGE_KEY = 'schemas-work-theme';
export const WELCOME_SEEN_KEY = 'schemas-work-has-seen-welcome';
export const HINT_SEEN_KEY = 'schemas-work-has-seen-command-hint';
export const SETTINGS_STORAGE_KEY = 'schemas-work-settings-v2';

// --- Limits & Thresholds ---
/** Maximum number of error logs to persist before rotating. */
export const MAX_ERROR_LOGS = 50;
/** Maximum length of a single text chunk sent to the TTS engine. */
export const MAX_TTS_TEXT_LENGTH = 150;

// --- UI Layout & Positioning ---
/** Safety buffer (px) between floating menus and the viewport edge. */
export const VIEWPORT_PADDING = 10;
/** Vertical offset (px) for floating menus relative to their trigger. */
export const CURSOR_OFFSET = 5;
/** Height of the fixed App Header (px). */
export const HEADER_HEIGHT = 60;
export const SHEET_MAX_WIDTH = 820;
export const SHEET_PADDING_X = '4rem';
export const SHEET_PADDING_Y = '3rem';

// --- Spaced Repetition System (SRS) Defaults ---
export const SRS_DEFAULTS = {
  EASE_FACTOR: 2.5, // Standard SM-2 starting ease
  INTERVAL: 0,
  REPETITIONS: 0,
  LEARNING_STEP: 1, // 1 = First step of learning phase
};
