/**
 * @file Centralized service for capturing, storing, and managing application-wide errors.
 *
 * @remarks
 * This service functions as a robust, persistent diagnostics recorder. It captures errors
 * that occur anywhere within the application, enriches them with valuable context (such as
 * the operation being performed at the time), and stores them in `localStorage`. This
 * creates a persistent, first-in-first-out log of issues that can be reviewed by the
 * user or sent to a developer for effective debugging.
 *
 * To prevent unbounded growth of the browser's storage, the log is capped to a
 * maximum number of entries (`MAX_LOGS`).
 */

/**
 * Defines the canonical structure for a single error entry in the log.
 */
export interface ErrorLog {
  /** The ISO 8601 timestamp indicating exactly when the error was logged. */
  timestamp: string;
  /** The primary error message, typically from `error.message`. */
  message: string;
  /** The stack trace of the error, if available, for detailed debugging. */
  stack?: string;
  /** A record of key-value pairs providing additional context at the time of the error to aid in diagnostics. */
  context?: Record<string, any>;
}

/**
 * The key used to store the array of error logs in the browser's `localStorage`.
 * @internal
 */
const ERROR_LOGS_STORAGE_KEY = 'schemas-work-error-logs';

/**
 * The maximum number of error records to maintain in the log. When this limit is exceeded,
 * the oldest entries are discarded.
 * @internal
 */
const MAX_LOGS = 50;

/**
 * Retrieves all stored error logs from `localStorage`.
 *
 * @returns An array of `ErrorLog` objects, sorted from the most recent to the oldest.
 *          Returns an empty array if the logs are corrupted or not present.
 */
export function getLogs(): ErrorLog[] {
  try {
    if (typeof window === 'undefined') return [];
    const storedLogs = localStorage.getItem(ERROR_LOGS_STORAGE_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (e) {
    console.error('Error parsing stored error logs. The logs may be corrupted.', e);
    // If parsing fails, the logs are likely corrupted. It's safer to clear them.
    clearLogs();
    return [];
  }
}

/**
 * Captures, formats, and logs a new error to the persistent history.
 *
 * This is the primary public method of the service.
 *
 * @param error - The captured error object. It can be of any type, but an `Error` object is preferred for its `stack` property.
 * @param context - An optional record of key-value pairs that provides context about the circumstances of the error (e.g., `{ operation: 'file.save' }`).
 */
export function reportError(error: Error | any, context?: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  const newLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    message: error?.message || 'An unknown or non-standard error occurred.',
    stack: error?.stack,
    context,
  };

  const existingLogs = getLogs();
  // Prepend the new log to the beginning of the array to maintain newest-first order.
  const updatedLogs = [newLog, ...existingLogs];

  // Enforce the size limit by trimming the array to the maximum allowed length.
  const trimmedLogs = updatedLogs.slice(0, MAX_LOGS);

  try {
    localStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (e) {
    // This might happen if localStorage is full.
    console.error('Could not save new error log to localStorage:', e);
  }

  // During development, also log to the console for immediate visibility and easier debugging.
  if (import.meta.env.DEV) {
    console.error('[Error Service Reported]:', newLog.message, {
      logEntry: newLog,
      originalError: error,
    });
  }
}

/**
 * Deletes all error logs from `localStorage`. Useful for cleanup or providing a fresh start.
 */
export function clearLogs(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ERROR_LOGS_STORAGE_KEY);
  } catch (e) {
    console.error('Could not clear error logs from localStorage:', e);
  }
}
