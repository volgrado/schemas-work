/**
 * @file focusTrap.ts
 * @module actions
 * @description
 * A Svelte action that traps keyboard focus within a specific DOM element.
 * Essential for accessibility in Modals and Dialogs, ensuring users cannot tab outside
 * the active overlay.
 *
 * Features:
 * - **Cycle Tabbing:** Tabbing from the last element jumps to the first, and Shift+Tab from first jumps to last.
 * - **Focus Management:** Automatically focuses the first interactive element on mount.
 * - **Focus Restoration:** Returns focus to the previously active element when destroyed.
 */

/**
 * Traps focus within the given node.
 * @param node - The HTML element to trap focus within.
 * @param enabled - Whether the trap is active.
 */
export function focusTrap(node: HTMLElement, enabled: boolean = true) {
  // Selector for all standard interactive elements
  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function handleKeydown(event: KeyboardEvent) {
    if (!enabled) return;
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      node.querySelectorAll(focusableSelector)
    ) as HTMLElement[];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    // Shift + Tab: Wrap from first to last
    if (event.shiftKey) {
      if (active === first) {
        last.focus();
        event.preventDefault();
      }
    }
    // Tab: Wrap from last to first
    else {
      if (active === last) {
        first.focus();
        event.preventDefault();
      }
    }
  }

  // Snapshot the element that had focus before the trap activated
  const previousFocus = document.activeElement as HTMLElement;

  // Initial focus placement
  if (enabled) {
    // Small timeout to ensure DOM is fully rendered/transitioned
    setTimeout(() => {
      const focusable = Array.from(
        node.querySelectorAll(focusableSelector)
      ) as HTMLElement[];
      if (focusable.length > 0) {
        focusable[0].focus({ preventScroll: true });
      } else {
        // Fallback: focus the container if nothing inside is interactive
        node.focus({ preventScroll: true });
      }
    }, 10);
  }

  window.addEventListener('keydown', handleKeydown);

  return {
    update(newEnabled: boolean) {
      enabled = newEnabled;
    },
    destroy() {
      window.removeEventListener('keydown', handleKeydown);
      // Restore focus to the original element (e.g. the button that opened the modal)
      if (previousFocus && previousFocus.focus) {
        previousFocus.focus();
      }
    },
  };
}
