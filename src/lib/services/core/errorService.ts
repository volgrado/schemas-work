// src/lib/services/core/errorService.ts

/**
 * @file Centralized service for capturing, storing, and managing errors.
 * It functions as a "black box" in the user's browser, saving a history
 * of issues that can be voluntarily reported for diagnostics.
 */

/**
 * Defines the structure of a single entry in the error log.
 */
export interface ErrorLog {
  /** The ISO-formatted date and time when the error was logged. */
  timestamp: string;
  /** The main message of the error. */
  message: string;
  /** The error's stack trace, if available. */
  stack?: string;
  /** An object with additional contextual information about where/when the error occurred. */
  context?: Record<string, any>;
}

/** The key used to store error logs in localStorage. */
const ERROR_LOGS_STORAGE_KEY = 'schemas-work-error-logs';

/** The maximum number of error records to keep in the history. */
const MAX_LOGS = 50;

/**
 * Retrieves all locally stored error logs.
 * @returns {ErrorLog[]} An array of error logs, from most recent to oldest.
 */
export function getLogs(): ErrorLog[] {
  try {
    const storedLogs = localStorage.getItem(ERROR_LOGS_STORAGE_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (e) {
    // If the logs are corrupted, clear them and return an empty array.
    console.error('Error parsing stored error logs:', e);
    clearLogs();
    return [];
  }
}

/**
 * Logs a new error to the persistent history.
 * This is the main function of the service.
 * @param {Error | any} error - The captured error object.
 * @param {Record<string, any>} [context] - Additional contextual data to aid in debugging.
 */
export function reportError(
  error: Error | any,
  context?: Record<string, any>,
): void {
  // 1. Create a new ErrorLog
  const newLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    context,
  };

  // 2. Get existing logs
  const existingLogs = getLogs();

  // 3. Add the new log to the beginning of the array
  const updatedLogs = [newLog, ...existingLogs];

  // 4. Limit the array to MAX_LOGS
  const trimmedLogs = updatedLogs.slice(0, MAX_LOGS);

  // 5. Save the updated array to localStorage
  try {
    localStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (e) {
    console.error('Could not save error logs to localStorage:', e);
  }

  // 6. Optional: Log to console during development for easier debugging
  if (import.meta.env.DEV) {
    console.error('[Error Service Reported]:', newLog.message, {
      logEntry: newLog,
      originalError: error,
    });
  }
}

/**
 * Deletes all error logs from local storage.
 */
export function clearLogs(): void {
  try {
    localStorage.removeItem(ERROR_LOGS_STORAGE_KEY);
  } catch (e) {
    console.error('Could not clear error logs from localStorage:', e);
  }
}
