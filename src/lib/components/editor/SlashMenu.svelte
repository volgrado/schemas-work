<!-- src/lib/components/editor/SlashMenu.svelte (CORREGIDO) -->
<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { CommandItem } from '$lib/editor/slashCommands';

  export let items: CommandItem[];
  export let command: (item: CommandItem) => void;

  let selectedIndex = 0;

  // Reactualiza el índice si la lista de items cambia (por el filtrado)
  $: if (items.length > 0 && selectedIndex >= items.length) {
    selectedIndex = 0;
  }

  function selectItem(index: number) {
    const item = items[index];
    if (item) {
      command(item);
    }
  }

  // --- Manejadores para el teclado ---
  function upHandler() {
    selectedIndex = (selectedIndex + items.length - 1) % items.length;
  }

  function downHandler() {
    selectedIndex = (selectedIndex + 1) % items.length;
  }

  function enterHandler() {
    selectItem(selectedIndex);
  }

  // Esta es la función que nuestra extensión de Tiptap llamará.
  export function onKeyDown({ event }: { event: KeyboardEvent }): boolean {
    if (event.key === 'ArrowUp') {
      upHandler();
      return true;
    }
    if (event.key === 'ArrowDown') {
      downHandler();
      return true;
    }
    if (event.key === 'Enter') {
      enterHandler();
      return true;
    }
    return false;
  }
</script>

<div class="slash-menu-container">
  {#if items.length > 0}
    {#each items as item, index}
      <button
        class="menu-item"
        class:is-selected={index === selectedIndex}
        on:click={() => selectItem(index)}
      >
        <div class="icon-wrapper"><Icon name={item.icon} size={20} /></div>
        <span>{item.title}</span>
      </button>
    {/each}
  {:else}
    <div class="empty-state">No hay resultados</div>
  {/if}
</div>

<style>
  .slash-menu-container {
    background-color: var(--color-background);
    border: 1px solid var(--color-gray-100);
    border-radius: var(--space-sm);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 180px;
    z-index: 70; /* Asegura que esté por encima del BubbleMenu */
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: var(--space-sm);
    border-radius: var(--space-xs);
    cursor: pointer;
    color: var(--color-text);
  }

  .menu-item.is-selected {
    background-color: var(--color-gray-100);
  }

  .icon-wrapper {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    background-color: var(--color-gray-100);
    border-radius: var(--space-xs);
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .menu-item.is-selected .icon-wrapper {
    background-color: var(--color-accent);
    color: white;
  }

  .empty-state {
    padding: var(--space-sm);
    color: var(--color-gray-500);
    font-style: italic;
    font-size: 0.9rem;
  }

  @media (prefers-color-scheme: dark) {
    .menu-item.is-selected {
      background-color: var(--color-gray-100);
    }
    .icon-wrapper {
      background-color: var(--color-gray-100);
    }
    .menu-item.is-selected .icon-wrapper {
      background-color: var(--color-accent);
      color: var(--color-background);
    }
  }
</style>
