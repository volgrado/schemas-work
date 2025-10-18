/**
 * @file Provides a generic debounce utility function.
 * @module debounce
 * @remarks Debouncing is a technique to limit the rate at which a function gets called.
 * It is particularly useful for handling events that can fire rapidly, such as window resizing,
 * scrolling, or user input in a text field. By delaying the execution of the function until
 * a certain amount of time has passed without the event firing again, it can significantly
 * improve performance and prevent unnecessary or expensive computations.
 */

/**
 * Creates a debounced version of a function. The debounced function will only
 * be executed after a specified `delay` has passed without it being called again.
 *
 * This is a higher-order function that takes a function and a delay, and returns a new
 * function that encapsulates the debouncing logic.
 *
 * @template T - The type of the function being debounced. It must be a function that takes any number of arguments and returns void.
 * @param func The function to be debounced.
 * @param delay The debounce delay in milliseconds. The function will not be executed until this much time has passed since the last call.
 * @returns A new function that, when invoked, will delay the execution of `func`.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;

  return function (this: any, ...args: Parameters<T>) {
    // When the debounced function is called, any previously scheduled execution is cancelled.
    clearTimeout(timeoutId);

    // A new timer is set to execute the original function after the specified delay.
    // `window.setTimeout` is used to be explicit about running in a browser environment.
    timeoutId = window.setTimeout(() => {
      // `apply` is used to preserve the original `this` context and arguments for the function call.
      func.apply(this, args);
    }, delay);
  };
}
