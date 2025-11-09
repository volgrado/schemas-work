// src/lib/actions/autosize.ts

/**
 * A reusable Svelte action that automatically resizes a textarea to fit its content.
 *
 * This enhanced version uses a ResizeObserver to automatically adjust the textarea's
 * height when its dimensions change for any reason (e.g., window resize), not just on user input.
 * It gracefully handles the 'box-sizing' CSS property to ensure accurate sizing.
 *
 * @param {HTMLTextAreaElement} node The textarea element to autosize.
 * @returns {import('svelte/action').ActionReturn} An object with a destroy method for cleanup.
 */
export function autosize(node: HTMLTextAreaElement) {
  let isObserving = false;

  function resize() {
    // 1. Reset height to 'auto'. This is crucial to allow the textarea to shrink
    //    if the content is deleted. It also forces the browser to recalculate scrollHeight.
    node.style.height = 'auto';

    // 2. Account for 'box-sizing: border-box'. The scrollHeight property includes padding
    //    but not the border. By getting the computed style, we can ensure the final
    //    height is pixel-perfect.
    const style = getComputedStyle(node);
    if (style.boxSizing === 'border-box') {
      const verticalBorders =
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      node.style.height = `${node.scrollHeight + verticalBorders}px`;
    } else {
      node.style.height = `${node.scrollHeight}px`;
    }
  }

  // Use a ResizeObserver to handle all size changes, including window resizing.
  const observer = new ResizeObserver(() => {
    // The observer might fire multiple times; we only need to resize once.
    // CORRECTED: Typo fixed here.
    if (isObserving) resize();
  });

  // Set initial size and start listening
  resize();
  node.addEventListener('input', resize);
  observer.observe(node);
  isObserving = true; // Start observing after the initial resize

  return {
    destroy() {
      // Cleanup all listeners and observers
      node.removeEventListener('input', resize);
      observer.unobserve(node);
      isObserving = false;
    },
  };
}
