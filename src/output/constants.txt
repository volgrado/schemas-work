/**
 * @file Centralizes application-wide constants.
 * @module constants
 */

// --- Storage Keys ---
export const ERROR_LOGS_STORAGE_KEY = 'schemas-work-error-logs';
export const IDENTITY_STORAGE_KEY = 'schemas-work-identity';
export const DIRECTORY_STORAGE_KEY = 'schemas-work-directory';
export const LAST_ACTIVE_DOC_KEY = 'schemas-work-last-active';
export const THEME_STORAGE_KEY = 'schemas-work-theme';

// --- Numerical Limits ---
export const MAX_ERROR_LOGS = 50;
export const MAX_TTS_TEXT_LENGTH = 150; // Max characters per TTS chunk

// --- UI Constants ---
// Example: If you decide to centralize these from components
export const VIEWPORT_PADDING = 10; // Minimum space between the menu and the edge of the window.
export const CURSOR_OFFSET = 5; // Vertical offset from the cursor.

// --- Other ---
// Add any other application-wide constants here
