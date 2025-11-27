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
    onBack,
    children, // This captures the <slot> content for Svelte 5
  } = $props<{ title: string; onBack?: () => void; children?: any }>();

  import Icon from '$lib/core/ui/Icon.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
</script>

<header class="view-header">
  <div class="header-left">
    {#if onBack}
      <button
        class="back-button"
        onclick={onBack}
        aria-label={i18n.t('common.back')}
      >
        <Icon name="arrow-left" size={18} />
      </button>
    {/if}
    <h2 class="view-title">{title}</h2>
  </div>
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

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .back-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    transition: var(--transition-fast);
  }

  .back-button:hover {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }
</style>
