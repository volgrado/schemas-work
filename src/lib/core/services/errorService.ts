/**
 * @file Centralized service for capturing, storing, and managing application-wide errors.
 * Includes Safe Mode, Crash Loop Detection, and Telemetry (Flight Recorder).
 * @module errorService
 */

import { ERROR_LOGS_STORAGE_KEY, MAX_ERROR_LOGS } from '$lib/constants';

export interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  telemetry?: string[]; // Flight Recorder trace
}

// --- CONSTANTS ---
const SAFE_MODE_KEY = 'schemas-work-safe-mode';
const CRASH_TIMESTAMPS_KEY = 'schemas-work-crash-timestamps';
const FLIGHT_RECORDER_SIZE = 50;
const CRASH_LOOP_THRESHOLD = 3;
const CRASH_LOOP_WINDOW_MS = 60000; // 1 minute

// --- STATE ---
const flightRecorderBuffer: string[] = [];
const recentErrorCounts: Record<string, { count: number; timestamp: number }> =
  {};

// --- TELEMETRY (FLIGHT RECORDER) ---

/**
 * Records a user action or system event to the in-memory flight recorder.
 * These actions are attached to error reports to help reproduce issues.
 */
export function recordAction(action: string, data?: unknown): void {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1); // HH:mm:ss.sss
  let entry = `[${timestamp}] ${action}`;

  if (data) {
    try {
      // Simple sanitization for privacy (very basic)
      const safeData = JSON.stringify(data, (key, value) => {
        if (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('key')
        ) {
          return '***MASKED***';
        }
        return value;
      });
      // Truncate long data
      entry += ` ${safeData.slice(0, 100)}${safeData.length > 100 ? '...' : ''}`;
    } catch {
      entry += ' [Data Serialization Error]';
    }
  }

  flightRecorderBuffer.push(entry);
  if (flightRecorderBuffer.length > FLIGHT_RECORDER_SIZE) {
    flightRecorderBuffer.shift();
  }
}

// --- SAFE MODE & CRASH LOOP ---

export function isSafeMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SAFE_MODE_KEY) === 'true';
}

export function setSafeMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(SAFE_MODE_KEY, 'true');
    console.warn('[Error Service] Safe Mode ENABLED');
  } else {
    localStorage.removeItem(SAFE_MODE_KEY);
    localStorage.removeItem(CRASH_TIMESTAMPS_KEY); // Reset crash history on exit
    console.log('[Error Service] Safe Mode DISABLED');
  }
}

function checkCrashLoop(): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();
    const rawTimestamps = localStorage.getItem(CRASH_TIMESTAMPS_KEY);
    let timestamps: number[] = rawTimestamps ? JSON.parse(rawTimestamps) : [];

    // Filter out old crashes
    timestamps = timestamps.filter((t) => now - t < CRASH_LOOP_WINDOW_MS);
    timestamps.push(now);

    localStorage.setItem(CRASH_TIMESTAMPS_KEY, JSON.stringify(timestamps));

    if (timestamps.length >= CRASH_LOOP_THRESHOLD) {
      console.error('[Error Service] Crash loop detected! Enabling Safe Mode.');
      setSafeMode(true);
    }
  } catch (e) {
    console.error('Error checking crash loop:', e);
  }
}

// --- ERROR REPORTING ---

interface PotentialError {
  message: unknown;
  stack?: unknown;
}

function isPotentialError(value: object): value is PotentialError {
  return 'message' in value;
}

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

export function reportError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  // --- RATE LIMITING ---
  // Prevent log flooding (e.g. infinite render loops)
  const errorKey = String(error);
  const now = Date.now();
  const recent = recentErrorCounts[errorKey];

  if (recent && now - recent.timestamp < 1000) {
    recent.count++;
    if (recent.count > 10) {
      if (recent.count === 11) {
        console.warn(
          '[Error Service] Rate limiting active for error:',
          errorKey
        );
      }
      return; // Drop error
    }
  } else {
    recentErrorCounts[errorKey] = { count: 1, timestamp: now };
  }

  // --- CRASH LOOP CHECK ---
  checkCrashLoop();

  let message = 'An unknown error occurred.';
  let stack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = error;
  } else if (
    typeof error === 'object' &&
    error !== null &&
    isPotentialError(error)
  ) {
    message =
      typeof error.message === 'string' ? error.message : JSON.stringify(error);
    stack = typeof error.stack === 'string' ? error.stack : undefined;
  }

  const newLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    message,
    stack,
    context,
    telemetry: [...flightRecorderBuffer], // Snapshot current telemetry
  };

  const existingLogs = getLogs();
  const updatedLogs = [newLog, ...existingLogs];
  const trimmedLogs = updatedLogs.slice(0, MAX_ERROR_LOGS);

  try {
    localStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(trimmedLogs));
  } catch (e) {
    // Quota management logic (same as before)
    if (
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.code === 22)
    ) {
      if (trimmedLogs.length > 1) {
        try {
          localStorage.setItem(
            ERROR_LOGS_STORAGE_KEY,
            JSON.stringify(trimmedLogs.slice(0, -1))
          );
        } catch {}
      }
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
