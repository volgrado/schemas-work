<!--
  @component
  ContextMenu

  This component provides a floating contextual menu that can be positioned
  anywhere on the screen. It is designed to be ephemeral, closing itself
  when the user clicks outside of it or presses the Escape key.

  It's a wrapper component; the actual menu items are passed in via the default slot.

  Features:
  - Absolutely positioned using `x` and `y` coordinates.
  - Automatically closes when a click occurs outside the menu bounds.
  - Automatically closes when the `Escape` key is pressed.
  - Graceful fade-in transition.
  - Correctly cleans up event listeners to prevent memory leaks.

  Props:
  - `x`: The horizontal (left) position of the menu in pixels.
  - `y`: The vertical (top) position of the menu in pixels.
  - `onClose`: A callback function that is invoked when the menu should be closed.

  Usage:
  {#if contextMenuState.visible}
    <ContextMenu x={contextMenuState.x} y={contextMenuState.y} onClose={closeMenu}>
      <button on:click={handleAction}>Action 1</button>
      <hr />
      <button on:click={handleDelete}>Delete</button>
    </ContextMenu>
  {/if}
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';

  /** @props {number} x - The horizontal position (left) of the menu in pixels. */
  export let x: number;
  /** @props {number} y - The vertical position (top) of the menu in pixels. */
  export let y: number;
  /** @props {() => void} onClose - The callback function to be called when the menu needs to close. */
  export let onClose: () => void;

  let menuElement: HTMLDivElement;

  /**
   * Closes the menu if a click is detected outside of its boundaries.
   */
  function handleClickOutside(event: MouseEvent) {
    if (menuElement && !menuElement.contains(event.target as Node)) {
      onClose();
    }
  }

  /**
   * Closes the menu if the 'Escape' key is pressed.
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  // Set up event listeners when the component is mounted.
  onMount(() => {
    // Using capture phase to catch the event early.
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleKeydown, true);
  });

  // Clean up event listeners when the component is destroyed to prevent memory leaks.
  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside, true);
    document.removeEventListener('keydown', handleKeydown, true);
  });
</script>

<div
  class="context-menu-panel"
  style="left: {x}px; top: {y}px;"
  bind:this={menuElement}
  transition:fade={{ duration: 100 }}
  role="menu"
>
  <!-- Slot for menu items (buttons, dividers, etc.) -->
  <slot />
</div>

<style>
  .context-menu-panel {
    position: fixed;
    z-index: 110; /* Must be above other elements like the CommandBar */
    min-width: 180px;
    background-color: var(
      --color-background-translucent,
      rgba(255, 255, 255, 0.75)
    );
    border: 1px solid var(--color-border, rgba(0, 0, 0, 0.08));
    border-radius: var(--space-sm);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    padding: var(--space-xs);
    backdrop-filter: blur(12px) saturate(150%);
    -webkit-backdrop-filter: blur(12px) saturate(150%);
  }

  /* Global styles for buttons passed into the slot */
  :global(.context-menu-panel button) {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--space-sm) var(--space-sm);
    border: none;
    background: none;
    font-family: var(--font-main);
    font-size: 0.9rem;
    color: var(--color-text);
    border-radius: var(--space-xs);
    text-align: left;
    gap: var(--space-sm);
    cursor: pointer;
    transition: background-color 0.2s ease;
    outline: none;
  }

  :global(.context-menu-panel button:hover) {
    background-color: var(--color-gray-100);
  }

  /* Global styles for dividers */
  :global(.context-menu-panel hr) {
    border: none;
    height: 1px;
    background-color: var(--color-border);
    margin: var(--space-xs) 0;
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .context-menu-panel {
      background-color: rgba(30, 30, 30, 0.75);
      border-color: rgba(255, 255, 255, 0.1);
    }
    :global(.context-menu-panel button:hover) {
      background-color: rgba(255, 255, 255, 0.1);
    }
    :global(.context-menu-panel hr) {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
</style>
