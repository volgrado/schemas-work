<!--
  @component
  ContextMenu

  @description
  A sophisticated, self-positioning contextual menu component.
  It provides a foundation for custom right-click or dropdown menus that automatically
  adjust their position to stay within the viewport bounds.

  Features:
  - **Smart Positioning:** Uses `@floating-ui/dom` to calculate optimal coordinates (flip/shift).
  - **Accessibility:** Automatically focuses the first interactive item for keyboard users.
  - **Dismissal:** Closes on outside clicks or `Escape` key press.
  - **Transitions:** Smooth fade-in and scale animation.

  @props
  - `x` (number): The viewport X coordinate for anchoring.
  - `y` (number): The viewport Y coordinate for anchoring.
  - `onClose` (function): Callback to close the menu.
  - `children` (snippet): The content of the menu (usually buttons).
-->
<script lang="ts">
  import type { TransitionConfig } from 'svelte/transition';
  import { computePosition, flip, shift } from '@floating-ui/dom';
  import type { VirtualElement } from '@floating-ui/dom';

  let {
    x,
    y,
    onClose,
    children, // Accept the children render snippet
  } = $props<{ x: number; y: number; onClose: () => void; children: import('svelte').Snippet }>();

  let menuElement = $state<HTMLDivElement | null>(null);
  let floatingStyle = $state('opacity: 0;'); // Start invisible to prevent flash before position calculation

  // Effect: Handle outside clicks and Escape key
  $effect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuElement && !menuElement.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Use capture phase to handle events before they bubble up to potential triggers
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleKeydown, true);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeydown, true);
    };
  });

  // Effect: Calculate Position & Manage Focus
  $effect(() => {
    if (menuElement) {
      // Create a virtual element representing the click coordinates
      const virtualReference: VirtualElement = {
        getBoundingClientRect: () => ({
          x,
          y,
          top: y,
          left: x,
          bottom: y,
          right: x,
          width: 0,
          height: 0,
        }),
      };

      // Calculate position, ensuring menu stays on screen
      computePosition(virtualReference, menuElement, {
        placement: 'bottom-start',
        middleware: [flip(), shift({ padding: 8 })],
      }).then(({ x: finalX, y: finalY }) => {
        floatingStyle = `left: ${finalX}px; top: ${finalY}px;`;
      });

      // Auto-focus the first item for keyboard accessibility
      const firstItem = menuElement.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstItem?.focus();
    }
  });

  const fadeAndScale = (
    node: Element,
    params: { duration: number }
  ): TransitionConfig => {
    return {
      ...params,
      css: (t) => `opacity: ${t}; transform: scale(${0.95 + 0.05 * t});`,
    };
  };
</script>

<div
  class="context-menu-panel"
  style={floatingStyle}
  bind:this={menuElement}
  transition:fadeAndScale={{ duration: 120 }}
  role="menu"
>
  {@render children?.()}
</div>

<style>
  .context-menu-panel {
    position: fixed;
    z-index: var(--z-dropdown);
    min-width: var(--width-menu-min);
    
    /* Premium Glassmorphism */
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);

    border-radius: var(--radius-md);
    padding: var(--space-xs);
    transform-origin: top left; /* Scale animation origin */
  }

  /* Button styling for children */
  :global(.context-menu-panel button) {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--space-sm);
    border: none;
    background: none;
    font-family: var(--font-main);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    border-radius: var(--radius-sm);
    text-align: left;
    gap: var(--space-sm);
    cursor: pointer;
    transition: background-color 0.2s ease;
    outline: none;
  }

  :global(.context-menu-panel button:focus-visible) {
    background-color: var(--btn-hover-bg);
    color: var(--color-accent);
  }
  :global(.context-menu-panel button:hover) {
    background-color: var(--btn-hover-bg);
  }

  :global(.context-menu-panel hr) {
    border: none;
    height: 1px;
    background-color: var(--color-border);
    margin: var(--space-xs) 0;
  }
</style>
