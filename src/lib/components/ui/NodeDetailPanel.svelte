<!--
  src/lib/components/ui/NodeDetailPanel.svelte
  A docked side panel that displays detailed information about a selected node.
  This component is controlled by the `nodeDetailStore` and features a robust
  CSS-based fly-in and fly-out animation.
-->
<script lang="ts">
  import {
    nodeDetailState,
    closePanel,
  } from '$lib/stores/nodeDetailStore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  /**
   * Effect to handle global keyboard events for accessibility.
   * When the panel is open, the 'Escape' key will close it.
   * The event listener is automatically cleaned up when the component is destroyed
   * or the panel is closed.
   */
  $effect(() => {
    if (nodeDetailState.isOpen) {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          closePanel();
        }
      };

      window.addEventListener('keydown', handleKeydown);

      // Return a cleanup function to remove the listener
      return () => {
        window.removeEventListener('keydown', handleKeydown);
      };
    }
  });
</script>

<!--
  The <aside> element is always present in the DOM to allow CSS transitions to
  animate its exit smoothly. A reactive class `is-visible` controls its
  position and visibility based on the store's state.
-->
<aside
  class="side-panel"
  class:is-visible={nodeDetailState.isOpen}
  role="region"
  aria-labelledby="panel-title"
  aria-hidden={!nodeDetailState.isOpen}
>
  <header class="panel-header">
    <h2 id="panel-title" class="panel-title" title={nodeDetailState.title}>
      {nodeDetailState.title}
    </h2>
    <Button
      variant="icon"
      onclick={closePanel}
      aria-label="Close details panel"
    >
      <Icon name="x" size={20} />
    </Button>
  </header>

  <div class="panel-content">
    <p>{nodeDetailState.content}</p>
  </div>
</aside>

<style>
  .side-panel {
    /* Layout & Sizing */
    display: flex;
    flex-direction: column;
    width: 100%; /* The parent grid controls the actual max-width */
    height: 100%;
    overflow: hidden;

    /* Theming & Appearance */
    background-color: var(--color-background);
    border-left: 1px solid var(--color-border);
    color: var(--color-text);

    /* --- ANIMATION SETUP --- */
    transform: translateX(100%);
    visibility: hidden;
    transition:
      transform var(--duration-base) var(--ease-in-out),
      visibility var(--duration-base);
    z-index: var(--z-elevated); /* Ensure it sits above standard content if needed */
  }

  /* --- VISIBLE STATE FOR ANIMATION --- */
  .side-panel.is-visible {
    transform: translateX(0);
    visibility: visible;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    padding: var(--space-md);
    /* This aligns the panel's title with the main content area */
    padding-top: calc(var(--height-header) + var(--space-sm));
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title {
    font-size: var(--font-size-lg);
    font-weight: 600;
    line-height: 1.4;
    color: var(--color-text);
    /* Ellipsis for long titles */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
  }

  .panel-content {
    flex-grow: 1; /* Fills the remaining vertical space */
    overflow-y: auto; /* Enables scrolling only for the content */
    padding: var(--space-lg);
    line-height: 1.7;
    color: var(--color-text-secondary);
  }

  .panel-content p {
    margin: 0;
  }
</style>
