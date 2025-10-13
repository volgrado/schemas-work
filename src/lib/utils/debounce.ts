// src/lib/utils/debounce.ts

/**
 * Creates a debounced version of a function. The debounced function will only
 * be executed after a certain time `delay` has passed without it being called again.
 *
 * @param func The function to be debounced.
 * @param delay The waiting time in milliseconds.
 * @returns A new function with the debounce behavior.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;

  return function (this: any, ...args: Parameters<T>) {
    // If called again, the previous timer is canceled.
    clearTimeout(timeoutId);

    // A new timer is set.
    timeoutId = window.setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
