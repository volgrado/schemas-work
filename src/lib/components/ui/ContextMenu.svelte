<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';

  export let x: number;
  export let y: number;
  export let onClose: () => void;

  let menuElement: HTMLDivElement;

  function handleClickOutside(event: MouseEvent) {
    if (menuElement && !menuElement.contains(event.target as Node)) {
      onClose();
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div
  class="context-menu-panel"
  style="left: {x}px; top: {y}px;"
  bind:this={menuElement}
  transition:fade={{ duration: 100 }}
>
  <slot />
</div>

<style>
  .context-menu-panel {
    position: fixed;
    z-index: 110; /* Debe estar por encima del CommandBar */
    min-width: 180px;
    background-color: var(--panel-bg-light);
    border: 1px solid var(--panel-border-light);
    border-radius: var(--space-sm);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    padding: var(--space-xs);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

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
    background-color: var(--btn-hover-bg);
  }

  :global(.context-menu-panel hr) {
    border: none;
    height: 1px;
    background-color: var(--panel-border-light);
    margin: var(--space-xs) 0;
  }

  @media (prefers-color-scheme: dark) {
    .context-menu-panel {
      background-color: var(--panel-bg-dark);
      border-color: var(--panel-border-dark);
    }
    :global(.context-menu-panel button:hover) {
      background-color: var(--btn-hover-bg-dark);
    }
    :global(.context-menu-panel hr) {
      background-color: var(--panel-border-dark);
    }
  }
</style>
