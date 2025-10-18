
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/services/i18n';

  export let show: boolean = false;
  export let title: string | null = null;
  export let onClose: () => void;

  function close() {
    onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if show}
  <button
    class="modal-overlay"
    on:click={close}
    transition:fade={{ duration: 150 }}
    aria-label={$t('modal.close_aria_label')}
  ></button>

  <div
    class="modal-panel"
    role="dialog"
    aria-modal="true"
    aria-label={title || $t('modal.default_aria_label')}
    transition:fly={{ y: 20, duration: 200 }}
  >
    {#if title}
      <header class="modal-header">
        <h2 class="modal-title">{title}</h2>
        <button
          class="modal-close-button"
          on:click={close}
          aria-label={$t('modal.close_aria_label')}
        >
          <Icon name="x" size={20} />
        </button>
      </header>
    {/if}

    <main class="modal-content">
      <slot />
    </main>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px); 
    z-index: 199;
    cursor: default;
    border: none;
    padding: 0;
  }

  .modal-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 200;
    width: 90vw;
    max-width: 500px;
    background-color: var(--color-background);
    border: 1px solid var(--color-gray-100);
    border-radius: var(--space-md);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-gray-100);
    flex-shrink: 0;
  }

  .modal-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .modal-close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-gray-500);
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .modal-close-button:hover {
    background-color: var(--color-gray-100);
    color: var(--color-text);
  }

  .modal-content {
    padding: var(--space-lg);
    overflow-y: auto;
  }
</style>
