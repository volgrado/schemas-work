/**
 * @file Centralized service for capturing, storing, and managing application-wide errors.
 * @module errorService
 *
 * @remarks
 * This service provides a unified, persistent error handling mechanism for the entire application.
 * Instead of scattering `console.error` calls throughout the codebase, other modules can delegate
 * error handling to this service. This approach offers several key advantages:
 *
 * 1.  **Centralization**: All error reporting logic is in one place, making it easy to modify
 *     or extend. For example, you could add a remote logging service (like Sentry or LogRocket)
 *     by changing only this file.
 * 2.  **Persistence**: By storing errors in `localStorage`, we can diagnose issues that occur
 *     over time or across sessions. Users can also access these logs to provide more detailed
 *     bug reports.
 * 3.  **Contextualization**: The `reportError` function accepts a `context` object, allowing
 *     developers to attach relevant data to an error, which is invaluable for debugging.
 * 4.  **Safety**: The service includes safety checks (like capping the number of logs and handling
 *     parsing errors) to prevent it from becoming a source of new problems.
 */

/**
 * Defines the structure for a single error entry in the log.
 */
export interface ErrorLog {
  /** The ISO 8601 timestamp when the error was logged. */
  timestamp: string;
  /** The primary error message. */
  message: string;
  /** The stack trace of the error, if available. */
  stack?: string;
  /** Additional context about the error. */
  context?: Record<string, any>;
}

const ERROR_LOGS_STORAGE_KEY = 'schemas-work-error-logs';
const MAX_LOGS = 50;

/**
 * Retrieves all stored error logs from `localStorage`.
 *
 * @returns {ErrorLog[]} An array of `ErrorLog` objects, sorted from most recent to oldest.
 */
export function getLogs(): ErrorLog[] {
  try {
    if (typeof window === 'undefined') return [];
    const storedLogs = localStorage.getItem(ERROR_LOGS_STORAGE_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (e) {
    console.error('Error parsing stored error logs. Clearing them.', e);
    clearLogs();
    return [];
  }
}

/**
 * Captures, formats, and logs a new error.
 *
 * @param {Error | any} error The captured error object.
 * @param {Record<string, any>} [context] Optional context about the error.
 */
export function reportError(
  error: Error | any,
  context?: Record<string, any>
): void {
  if (typeof window === 'undefined') return;

  const newLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    message: error?.message || 'An unknown error occurred.',
    stack: error?.stack,
    context,
  };

  const existingLogs = getLogs();
  const updatedLogs = [newLog, ...existingLogs];
  const trimmedLogs = updatedLogs.slice(0, MAX_LOGS);

  try {
    localStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (e) {
    console.error('Could not save new error log to localStorage:', e);
  }

  if (import.meta.env.DEV) {
    console.error('[Error Service Reported]:', newLog.message, {
      logEntry: newLog,
      originalError: error,
    });
  }
}

/**
 * Deletes all error logs from `localStorage`.
 */
export function clearLogs(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ERROR_LOGS_STORAGE_KEY);
  } catch (e) {
    console.error('Could not clear error logs from localStorage:', e);
  }
}
