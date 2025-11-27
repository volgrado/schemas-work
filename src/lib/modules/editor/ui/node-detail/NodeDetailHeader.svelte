<!--
  @component
  NodeDetailHeader

  @description
  The top section of the Node Detail Panel.

  Features:
  - **Navigation Controls:** Up/Down chevrons to traverse the flattened document tree.
  - **Title Display:** Shows the current node's title with truncation for long text.
  - **Close Action:** Prominent button to dismiss the panel.
  - **Responsive Layout:** Adapts padding and touch targets for mobile devices.
-->
<script lang="ts">
  import {
    nodeDetailState,
    closePanel,
    navigateToSibling,
  } from '$lib/modules/editor/ui/nodeDetailStore.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';

  function navigateToPrev() {
    navigateToSibling('prev');
  }

  function navigateToNext() {
    navigateToSibling('next');
  }
</script>

<header class="panel-header">
  <div class="header-top">
    <!-- Navigation Group -->
    <div class="nav-chevrons">
      <Button
        variant="ghost"
        size="sm"
        onclick={navigateToPrev}
        aria-label="Previous node"
        title="Previous node (← or ↑)"
      >
        <Icon name="chevron-up" size={18} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onclick={navigateToNext}
        aria-label="Next node"
        title="Next node (→ or ↓)"
      >
        <Icon name="chevron-down" size={18} />
      </Button>
    </div>

    <!-- Close Action -->
    <Button
      variant="ghost"
      size="sm"
      onclick={closePanel}
      aria-label="Close details panel"
    >
      <Icon name="x" size={20} />
    </Button>
  </div>

  <!-- Node Title -->
  <h2 id="panel-title" class="panel-title" title={nodeDetailState.title}>
    {nodeDetailState.title}
  </h2>
</header>

<style>
  .panel-header {
    padding: var(--space-lg);
    /* Account for the global AppHeader height */
    padding-top: calc(var(--height-header) + var(--space-md));
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    border-bottom: 1px solid var(--color-border);
    /* Subtle gradient background */
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.05),
      transparent
    );
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xs);
  }

  .nav-chevrons {
    display: flex;
    gap: 2px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .panel-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    margin: 0;

    /* Gradient Text Effect */
    background: linear-gradient(
      135deg,
      var(--color-text) 0%,
      var(--color-text-secondary) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent; /* Fallback handled by fill-color */

    /* Line clamping for long titles */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (max-width: 480px) {
    .panel-title {
      font-size: 1.25rem;
    }

    .nav-chevrons :global(button) {
      min-width: 40px;
      min-height: 40px;
    }

    .panel-header {
      padding: var(--space-md);
    }
  }
</style>
