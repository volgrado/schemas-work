/**
 * @file Svelte action to trap focus within a DOM element.
 * Useful for modals, dialogs, and other overlays.
 */

export function focusTrap(node: HTMLElement, enabled: boolean = true) {
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function handleKeydown(event: KeyboardEvent) {
    if (!enabled) return;
    if (event.key !== 'Tab') return;

    const focusable = Array.from(node.querySelectorAll(focusableSelector)) as HTMLElement[];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first) {
        last.focus();
        event.preventDefault();
      }
    } else {
      if (active === last) {
        first.focus();
        event.preventDefault();
      }
    }
  }

  // Store the element that had focus before opening
  const previousFocus = document.activeElement as HTMLElement;

  // Move focus to the first focusable element inside
  if (enabled) {
    const focusable = Array.from(node.querySelectorAll(focusableSelector)) as HTMLElement[];
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      // If no focusable element, focus the container itself (ensure it has tabindex)
      node.focus();
    }
  }

  window.addEventListener('keydown', handleKeydown);

  return {
    update(newEnabled: boolean) {
      enabled = newEnabled;
    },
    destroy() {
      window.removeEventListener('keydown', handleKeydown);
      // Restore focus
      if (previousFocus && previousFocus.focus) {
        previousFocus.focus();
      }
    }
  };
}
