/**
 * @file Centralized service for capturing, storing, and managing application-wide errors.
 * @module errorService
 */

import { ERROR_LOGS_STORAGE_KEY, MAX_ERROR_LOGS } from '$lib/constants';

export interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

// --- NITPICK IMPLEMENTED: Type guard for generic error-like objects ---
/**
 * A helper interface to describe the shape of an object that might be an error,
 * but isn't an instance of the `Error` class.
 */
interface PotentialError {
  message: unknown;
  stack?: unknown;
}

/**
 * Type guard function to check if an object has a 'message' property,
 * narrowing its type to `PotentialError` for safer property access.
 * @param value The value to check.
 * @returns True if the value is an object with a 'message' property.
 */
function isPotentialError(value: object): value is PotentialError {
  return 'message' in value;
}
// --- End of Implementation ---

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
 * @param {unknown} error The captured error object. Using `unknown` is safer than `any`.
 * @param {Record<string, any>} [context] Optional context about the error.
 */
export function reportError(
  error: unknown,
  context?: Record<string, any>
): void {
  if (typeof window === 'undefined') return;

  let message = 'An unknown error occurred.';
  let stack: string | undefined;

  // 1. Handle actual Error instances (most common and reliable case)
  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  }
  // 2. Handle primitive strings being thrown
  else if (typeof error === 'string') {
    message = error;
  }
  // 3. NITPICK IMPLEMENTED: Handle generic objects using the type guard
  else if (
    typeof error === 'object' &&
    error !== null &&
    isPotentialError(error)
  ) {
    // The type guard narrows `error` to `PotentialError`, allowing safe access to `message` and `stack`.
    message =
      typeof error.message === 'string' ? error.message : JSON.stringify(error);
    stack = typeof error.stack === 'string' ? error.stack : undefined;
  }

  const newLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    message,
    stack,
    context,
  };

  const existingLogs = getLogs();
  const updatedLogs = [newLog, ...existingLogs];
  const trimmedLogs = updatedLogs.slice(0, MAX_ERROR_LOGS);

  try {
    localStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (e) {
    // Proactive quota management. If storage is full, it removes
    // the oldest log and retries the operation once.
    if (
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.code === 22)
    ) {
      console.warn(
        'LocalStorage quota exceeded. Removing oldest log and retrying...'
      );
      if (trimmedLogs.length > 1) {
        // Create a new array without the oldest entry
        const logsWithOldestRemoved = trimmedLogs.slice(0, -1);
        try {
          // Retry the save operation
          localStorage.setItem(
            ERROR_LOGS_STORAGE_KEY,
            JSON.stringify(logsWithOldestRemoved)
          );
        } catch (retryError) {
          console.error(
            'Could not save error log even after trimming:',
            retryError
          );
        }
      }
    } else {
      console.error('Could not save new error log to localStorage:', e);
    }
  }

  if (import.meta.env.DEV) {
    console.error('[Error Service Reported]:', newLog.message, {
      logEntry: newLog,
      originalError: error,
    });
  }
}

export function clearLogs(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ERROR_LOGS_STORAGE_KEY);
  } catch (e) {
    console.error('Could not clear error logs from localStorage:', e);
  }
}
