<!--
  @component
  ContextMenu

  An exceptional, floating contextual menu that intelligently positions itself to remain
  within the viewport. It provides a robust and accessible foundation for building
  right-click menus and other contextual actions.

  Features:
  - Smartly positioned using `@floating-ui/dom` to prevent overflow.
  - Automatically closes on outside clicks or 'Escape' key presses.
  - Manages focus by automatically focusing the first item, a critical accessibility feature.
  - Polished fade-and-scale transition for a premium feel.
  - Modern Svelte 5 implementation with declarative, side-effect-free logic.

  Props:
  - `x`: The desired horizontal (left) position in pixels.
  - `y`: The desired vertical (top) position in pixels.
  - `onClose`: A callback function invoked when the menu should be closed.
-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { TransitionConfig } from 'svelte/transition';
  import { computePosition, flip, shift } from '@floating-ui/dom';
  import type { VirtualElement } from '@floating-ui/dom';

  // --- Svelte 5 Props ---
  let {
    x,
    y,
    onClose,
    children, // Accept the children render snippet
  } = $props<{ x: number; y: number; onClose: () => void; children: any }>();

  // --- Svelte 5 State ---
  let menuElement = $state<HTMLDivElement | null>(null);
  let floatingStyle = $state('opacity: 0;'); // Start invisible

  /**
   * ENHANCEMENT: This `$effect` handles all side effects (event listeners for closing)
   * and their cleanup. It runs only once when the component is created.
   */
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

    // Using capture phase to catch events early.
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleKeydown, true);

    // The return function is the cleanup, preventing memory leaks.
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeydown, true);
    };
  });

  /**
   * ENHANCEMENT: This `$effect` handles smart positioning and focus management.
   */
  $effect(() => {
    if (menuElement) {
      // Define a virtual element based on the x/y coordinates.
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

      // Calculate the optimal position, flipping if necessary.
      computePosition(virtualReference, menuElement, {
        placement: 'bottom-start',
        middleware: [flip(), shift({ padding: 8 })],
      }).then(({ x: finalX, y: finalY }) => {
        floatingStyle = `left: ${finalX}px; top: ${finalY}px;`;
      });

      // Focus the first interactive item in the menu for accessibility.
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
    z-index: var(--z-context-menu);
    min-width: 200px;
    background-color: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-xl);
    padding: var(--space-xs);
    transform-origin: top left; /* For the scale animation */
  }

  :global(.context-menu-panel button) {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--space-sm);
    border: none;
    background: none;
    font-family: var(--font-main);
    font-size: 0.9rem;
    color: var(--color-text);
    border-radius: var(--border-radius-sm);
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

  /* Dark mode with "glassmorphism" effect */
  :global(.dark-theme) .context-menu-panel {
    background-color: var(--panel-bg-dark);
    border-color: var(--panel-border-dark);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
  }
  :global(.dark-theme .context-menu-panel button:focus-visible) {
    background-color: var(--btn-hover-bg-dark);
    color: var(--color-accent);
  }
  :global(.dark-theme .context-menu-panel button:hover) {
    background-color: var(--btn-hover-bg-dark);
  }
  :global(.dark-theme .context-menu-panel hr) {
    background-color: var(--panel-border-dark);
  }
</style>
