// src/lib/utils/debounce.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    // Use fake timers to control time-based execution
    vi.useFakeTimers();
  });

  it('should call the function only once after the delay, even when called multiple times', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 1000);

    // Call rapidly
    debouncedFunc();
    debouncedFunc();
    debouncedFunc();

    expect(func).not.toHaveBeenCalled();

    // Advance time to just before the delay
    vi.advanceTimersByTime(999);
    expect(func).not.toHaveBeenCalled();

    // Call again, resetting the timer
    debouncedFunc();

    // Advance time to allow the *new* delay to pass
    vi.advanceTimersByTime(1000);

    // Now the function should be called exactly once
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should pass the latest arguments to the debounced function', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 100);

    debouncedFunc('first');
    debouncedFunc('second');
    debouncedFunc('third', 123);

    vi.runAllTimers(); // Run all pending timers

    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith('third', 123);
  });

  it('should preserve the correct "this" context', () => {
    const func = vi.fn();
    const context = { id: 1, method: debounce(func, 100) };

    context.method(42);
    vi.runAllTimers(); // Run all pending timers

    expect(func).toHaveBeenCalledTimes(1);
    // Use the first call's 'this' context
    expect(func.mock.instances[0]).toBe(context);
  });

  it('should call the function immediately if called only once and timers run out', () => {
    const func = vi.fn();
    const debouncedFunc = debounce(func, 500);

    debouncedFunc();
    expect(func).not.toHaveBeenCalled();

    vi.runAllTimers(); // Run all pending timers
    expect(func).toHaveBeenCalledTimes(1);
  });
});
