# Utility Functions (`/src/lib/utils`)

This directory is a container for small, reusable, and mostly pure functions that do not fit into any other category of the project's architecture.

## Philosophy

The purpose of utilities is to avoid code duplication and abstract common logic into simple, easy-to-test functions.

1.  **Purity and No Side Effects**: Ideally, a utility function should be a pure function. This means that for the same input, it will always produce the same output and have no observable side effects (such as modifying the global state or making a network call).

2.  **Reusability**: The functions here should be generic enough to be used in multiple places in the application. If a function is only used in one component or service, it is better to keep it local to that file.

3.  **Simplicity**: Utilities should be small and have a single responsibility. If a utility function starts to grow in complexity, it is a sign that it may need to be refactored or moved to a service if it contains business logic.

## What Goes Here?

- **Formatters**: Functions for formatting dates, numbers, or strings (e.g., `formatDate(date)`).
- **Data Manipulation Helpers**: Functions for working with arrays, objects, or strings that are not provided natively by JavaScript (e.g., `groupBy(array, key)`).
- **Timing Functions**: Implementations of `debounce` and `throttle` to control the frequency with which functions are executed.
- **Generators**: Functions that generate values, such as unique IDs (e.g., a simple wrapper around `uuid`).

## What Does NOT Go Here?

- **Business Logic**: Any logic that is specific to the application's domain (e.g., calculating the next review date of a card) belongs in a service in `/src/lib/services`.
- **State Logic**: Any function that needs to read from or write to a Svelte Store. That logic belongs in the store itself.
- **API Calls**: Communication with external systems is the responsibility of the services.
- **Component-Specific Code**: Logic that directly manipulates a component's state or props should remain within that component.

## Usage Example

A classic use case is the `debounce` function, which delays the execution of a function until a certain amount of time has passed without it being called again. It is useful for avoiding excessive calls to functions on events such as `input` or window resizing.

```javascript
// src/lib/utils/debounce.ts
export function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}
```

```svelte
<script>
  import { debounce } from '$lib/utils/debounce';

  function handleInput(event) {
    console.log('Searching for:', event.target.value);
  }

  const debouncedHandleInput = debounce(handleInput, 300);
</script>

// In a component
<input type="text" on:input={debouncedHandleInput} />
```
