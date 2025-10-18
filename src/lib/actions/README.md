# Svelte Actions (`/src/lib/actions`)

This directory contains custom Svelte actions. Actions are a powerful feature of Svelte that allow you to attach behavioral logic to DOM elements. They are a clean way to reuse DOM interactions without having to encapsulate them in full components.

## Philosophy

We use actions to encapsulate complex or repetitive interactions with the DOM that are not suitable for being a component. This helps us keep our component code cleaner and more declarative. Actions are ideal for:

- Interacting with third-party libraries that manipulate the DOM.
- Managing custom or complex DOM events.
- Adding dynamic behavior that depends on the lifecycle of an element.

## Available Actions

### `clickOutside`

- **Purpose**: To execute a callback function when the user clicks _outside_ of the element to which the action is applied.
- **Typical Use**: Closing dropdown menus, modals, or panels when the user interacts with another part of the application. This is essential for a fluid and intuitive user experience.
- **Implementation**: The action attaches an event listener to the `window` object. When a click occurs, it checks if the `event.target` is contained within the node to which the action is attached. If it is not, it invokes the callback function.

  ```svelte
  <script>
    import { clickOutside } from '$lib/actions/clickOutside';
    let isOpen = true;
    function close() {
      isOpen = false;
    }
  </script>

  {#if isOpen}
    <div use:clickOutside on:click_outside={close}>
      <p>Menu content...</p>
    </div>
  {/if}
  ```

### `portal`

- **Purpose**: To render a DOM element in a different location in the DOM tree, usually in the `document.body`.
- **Typical Use**: Essential for components that need to "escape" their parent containers to avoid issues with `z-index`, `overflow: hidden`, or positioning. It is used for modals, tooltips, and floating menus.
- **Implementation**: The action simply takes the node and moves it to `document.body` when the element is mounted in the DOM. It also takes care of cleaning up and removing the node from the `body` when the element is destroyed, preventing memory leaks.

  ```svelte
  <script>
    import { portal } from '$lib/actions/portal';
  </script>

  <div use:portal>
    <p>This modal will be rendered in the body, not where it is declared.</p>
  </div>
  ```
