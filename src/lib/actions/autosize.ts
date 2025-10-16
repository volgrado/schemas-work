// src/lib/actions/autosize.ts

/**
 * A reusable Svelte action that automatically resizes a textarea to fit its content.
 * @param {HTMLTextAreaElement} node The textarea element.
 */
export function autosize(node: HTMLTextAreaElement) {
  function resize() {
    // Temporarily reset height to calculate the new scroll height accurately.
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }

  // Set initial size
  resize();

  node.addEventListener('input', resize);

  return {
    destroy() {
      node.removeEventListener('input', resize);
    },
  };
}
