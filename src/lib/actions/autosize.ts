/**
 * @file autosize.ts
 * @module actions
 * @description
 * A Svelte action that automatically adjusts the height of a `<textarea>` element
 * to fit its content dynamically.
 *
 * Mechanism:
 * 1. Resets height to `auto` to allow shrinking.
 * 2. Reads `scrollHeight` to determine content height.
 * 3. Adjusts for border-box model if necessary.
 * 4. Uses `ResizeObserver` to handle layout changes (e.g. window resize).
 */

import type { Action } from 'svelte/action';

/**
 * Enables auto-sizing behavior on a textarea.
 * @param node - The HTMLTextAreaElement.
 */
export const autosize: Action<HTMLTextAreaElement> = (node) => {
  let isObserving = false;

  function resize() {
    // 1. Reset height to 'auto'. This allows the textarea to shrink if content is deleted.
    //    Crucial: Without this, it would only ever grow.
    node.style.height = 'auto';

    // 2. Calculate precise height, accounting for box-sizing
    const style = getComputedStyle(node);
    const scrollHeight = node.scrollHeight;

    if (style.boxSizing === 'border-box') {
      const verticalBorders =
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      node.style.height = `${scrollHeight + verticalBorders}px`;
    } else {
      node.style.height = `${scrollHeight}px`;
    }
  }

  // Handle external layout changes (e.g. window resize)
  const observer = new ResizeObserver(() => {
    if (isObserving) resize();
  });

  // Init
  resize();

  // Bind listeners
  node.addEventListener('input', resize);
  // Also listen for change events (e.g. pasted content)
  node.addEventListener('change', resize);

  observer.observe(node);
  isObserving = true;

  return {
    destroy() {
      node.removeEventListener('input', resize);
      node.removeEventListener('change', resize);
      observer.disconnect();
      isObserving = false;
    },
  };
};
