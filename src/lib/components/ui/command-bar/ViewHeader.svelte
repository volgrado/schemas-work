<!--
  @component
  ViewHeader

  A standardized header for all command bar sub-views. It provides a consistent
  layout with a title on the left and a slot for action buttons on the right,
  ensuring a cohesive navigation experience.
-->
<script lang="ts">
  let {
    title,
    children, // This captures the <slot> content for Svelte 5
  } = $props<{ title: string; children?: any }>();
</script>

<header class="view-header">
  <h2 class="view-title">{title}</h2>
  <div class="header-actions">
    {@render children?.()}
  </div>
</header>

<style>
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px 12px 14px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .view-title {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  :global(.dark-theme) .view-header {
    border-color: var(--panel-border-dark);
  }
</style>
