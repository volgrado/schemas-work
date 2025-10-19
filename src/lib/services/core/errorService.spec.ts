/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as errorService from './errorService';
import { ERROR_LOGS_STORAGE_KEY, MAX_ERROR_LOGS } from '$lib/constants';
import type { ErrorLog } from './errorService';

// Mock console.error to suppress output during tests and allow spying
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('errorService', () => {
  const MOCK_TIME = 1672531200000;

  // Helper to quickly create a mock Error object
  const createMockError = (message: string, stack: string = 'mock-stack') => ({
    message,
    stack,
  });

  // Helper to generate a new mock log entry with increasing time
  const createMockLog = (i: number): ErrorLog => ({
    timestamp: new Date(MOCK_TIME + i * 1000).toISOString(),
    message: `Test Error ${i}`,
    stack: 'mock-stack',
    context: { i },
  });

  beforeEach(() => {
    // Ensure localStorage is clean for each test
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------
  // Core Functionality (getLogs, reportError)
  // -------------------------

  describe('reportError', () => {
    it('should correctly format and save a new error to localStorage', () => {
      const mockError = createMockError('Network Failure');
      errorService.reportError(mockError, { operation: 'fetch' });

      const storedLogs = JSON.parse(
        localStorage.getItem(ERROR_LOGS_STORAGE_KEY) || '[]'
      );

      expect(storedLogs).toHaveLength(1);
      expect(storedLogs[0].message).toBe('Network Failure');
      expect(storedLogs[0].timestamp).toBe(new Date(MOCK_TIME).toISOString());
      expect(storedLogs[0].context).toEqual({ operation: 'fetch' });
    });

    it('should prepend new errors, making the log descending by time', () => {
      const firstError = createMockError('Error A');
      errorService.reportError(firstError);

      vi.setSystemTime(MOCK_TIME + 1000); // Advance time

      const secondError = createMockError('Error B');
      errorService.reportError(secondError);

      const storedLogs = JSON.parse(
        localStorage.getItem(ERROR_LOGS_STORAGE_KEY) || '[]'
      );

      expect(storedLogs).toHaveLength(2);
      expect(storedLogs[0].message).toBe('Error B'); // Newest is first
      expect(storedLogs[1].message).toBe('Error A'); // Oldest is last
    });

    it('should default the message for unknown/non-Error objects', () => {
      errorService.reportError(null);
      const storedLogs = JSON.parse(
        localStorage.getItem(ERROR_LOGS_STORAGE_KEY) || '[]'
      );
      expect(storedLogs[0].message).toBe('An unknown error occurred.');
    });
  });

  describe('getLogs', () => {
    it('should retrieve an empty array if no logs exist', () => {
      const logs = errorService.getLogs();
      expect(logs).toEqual([]);
    });

    it('should retrieve and parse existing logs correctly', () => {
      const mockLogs = [createMockLog(1), createMockLog(0)];
      localStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(mockLogs));

      const logs = errorService.getLogs();
      expect(logs).toEqual(mockLogs);
    });

    it('should call clearLogs and report an error if stored logs are corrupted', () => {
      // Simulate corrupted storage data
      localStorage.setItem(ERROR_LOGS_STORAGE_KEY, 'invalid json');

      const logs = errorService.getLogs();

      expect(logs).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing stored error logs'),
        expect.any(Object)
      );
      // Verify that clearLogs was called via the internal implementation
      expect(localStorage.getItem(ERROR_LOGS_STORAGE_KEY)).toBeNull();
    });
  });

  // -------------------------
  // Constraints and Limits
  // -------------------------

  describe('MAX_ERROR_LOGS enforcement', () => {
    it('should only keep the most recent MAX_ERROR_LOGS entries when reported sequentially', () => {
      // 1. Report MAX_ERROR_LOGS errors to fill the log.
      // We'll name them Error 0, Error 1, ..., Error 4 (assuming MAX is 5)
      for (let i = 0; i < MAX_ERROR_LOGS; i++) {
        vi.setSystemTime(MOCK_TIME + i * 1000);
        errorService.reportError(createMockError(`Error ${i}`));
      }

      let storedLogs = errorService.getLogs();
      expect(storedLogs).toHaveLength(MAX_ERROR_LOGS);
      expect(storedLogs[0].message).toBe(`Error ${MAX_ERROR_LOGS - 1}`); // Newest is first
      expect(storedLogs[MAX_ERROR_LOGS - 1].message).toBe('Error 0'); // Oldest is last

      // 2. Report one more error, which should push the oldest ("Error 0") out.
      vi.setSystemTime(MOCK_TIME + MAX_ERROR_LOGS * 1000);
      errorService.reportError(createMockError('The Overflow Error'));

      // 3. Verify the final state
      storedLogs = errorService.getLogs();
      expect(storedLogs).toHaveLength(MAX_ERROR_LOGS);
      expect(storedLogs[0].message).toBe('The Overflow Error'); // The newest is now at the top
      expect(storedLogs[MAX_ERROR_LOGS - 1].message).toBe('Error 1'); // "Error 0" has been pushed out

      // Explicitly check that the oldest error is gone
      const hasOldestError = storedLogs.some(
        (log) => log.message === 'Error 0'
      );
      expect(hasOldestError).toBe(false);
    });
  });

  describe('clearLogs', () => {
    it('should remove the error log key from localStorage', () => {
      localStorage.setItem(ERROR_LOGS_STORAGE_KEY, '[{"message":"test"}]');
      errorService.clearLogs();
      expect(localStorage.getItem(ERROR_LOGS_STORAGE_KEY)).toBeNull();
    });
  });
});
