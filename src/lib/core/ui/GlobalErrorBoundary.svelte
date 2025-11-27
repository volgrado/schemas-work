<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';

  let { error } = $props<{ error: unknown }>();

  function reload() {
    window.location.reload();
  }
</script>

<div class="error-boundary">
  <div class="error-content">
    <Icon name="alert-triangle" size="48" class="text-error" />
    <h1>{i18n.t('error.global_boundary_title')}</h1>
    <p class="error-message">
      {error instanceof Error ? error.message : String(error)}
    </p>
    <Button variant="primary" onclick={reload}>
      {i18n.t('common.reload')}
    </Button>
  </div>
</div>

<style>
  .error-boundary {
    display: flex;
    justify-content: center;
    height: 100vh;
    width: 100vw;
    background-color: var(--color-background);
    color: var(--color-text);
  }

  .error-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
    padding: var(--space-xl);
    background-color: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    max-width: 500px;
    text-align: center;
  }

  .error-message {
    color: var(--color-text-muted);
    font-family: monospace;
    background: var(--color-surface-hover);
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    word-break: break-all;
  }
</style>
