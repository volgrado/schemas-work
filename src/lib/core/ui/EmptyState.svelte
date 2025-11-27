<script lang="ts">
  import Icon from '$lib/core/ui/Icon.svelte';
  import Button from '$lib/core/ui/Button.svelte';

  let {
    title = 'No items found',
    description = 'There are no items to display at this time.',
    icon = 'inbox',
    actionLabel,
    actionId,
    onaction
  } = $props<{
    title?: string;
    description?: string;
    icon?: string;
    actionLabel?: string;
    actionId?: string;
    onaction?: () => void;
  }>();
</script>

<div class="empty-state">
  <div class="icon-wrapper">
    <Icon name={icon} size={48} />
  </div>
  <h3>{title}</h3>
  <p>{description}</p>
  {#if actionLabel && onaction}
    <Button id={actionId} onclick={onaction} variant="primary">
      {actionLabel}
    </Button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-xl);
    color: var(--color-text-secondary);
    height: 100%;
    min-height: 200px;
  }

  .icon-wrapper {
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-md);
    opacity: 0.5;
  }

  h3 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-xs);
  }

  p {
    font-size: var(--font-size-base);
    max-width: 400px;
    margin: 0 0 var(--space-lg);
    line-height: 1.5;
  }
</style>
