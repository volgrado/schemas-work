<!-- src/lib/components/editor/SlashMenuController.svelte -->
<script lang="ts">
  import { slashMenuStore } from '$lib/stores/slashMenuStore';
  import Icon from '$lib/components/ui/Icon.svelte';

  let menuElement = $state<HTMLElement | undefined>();
  let style = $state('');

  const VIEWPORT_PADDING = 10;
  const CURSOR_OFFSET = 5;

  $effect(() => {
    if ($slashMenuStore.isOpen && $slashMenuStore.clientRect && menuElement) {
      const rect = $slashMenuStore.clientRect();
      if (!rect) {
        style = 'opacity: 0; pointer-events: none;';
        return;
      }

      const menuHeight = menuElement.offsetHeight;
      const menuWidth = menuElement.offsetWidth;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      const posBelow = rect.bottom + window.scrollY + CURSOR_OFFSET;
      const posAbove = rect.top + window.scrollY - menuHeight - CURSOR_OFFSET;

      let top: number;

      const hasSpaceBelow =
        posBelow + menuHeight < windowHeight - VIEWPORT_PADDING;
      const hasSpaceAbove = posAbove > VIEWPORT_PADDING;

      if (hasSpaceBelow) {
        top = posBelow;
      } else if (hasSpaceAbove) {
        top = posAbove;
      } else {
        top = posBelow;
      }

      let left = rect.left + window.scrollX;

      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
      }

      if (left + menuWidth > windowWidth - VIEWPORT_PADDING) {
        left = windowWidth - menuWidth - VIEWPORT_PADDING;
      }

      if (top < VIEWPORT_PADDING) {
        top = VIEWPORT_PADDING;
      }
      if (top + menuHeight > windowHeight - VIEWPORT_PADDING) {
        top = windowHeight - menuHeight - VIEWPORT_PADDING;
      }

      style = `opacity: 1; transform: translate(${left}px, ${top}px);`;
    } else {
      style = 'opacity: 0; pointer-events: none;';
    }
  });
</script>

{#if $slashMenuStore.isOpen}
  <div
    class="slash-menu-container"
    bind:this={menuElement}
    style="position: absolute; top: 0; left: 0; {style}"
  >
    {#if $slashMenuStore.allItems.length > 0}
      <div class="group-tabs">
        {#each $slashMenuStore.groups as group, index}
          <button
            class="group-tab"
            class:is-active={index === $slashMenuStore.activeGroupIndex}
            onclick={() => slashMenuStore.setActiveGroup(index)}
          >
            {group}
          </button>
        {/each}
      </div>
      <div class="items-list">
        {#each $slashMenuStore.filteredItems as item, index (item.title)}
          <button
            class="menu-item"
            class:is-selected={index === $slashMenuStore.selectedIndex}
            onclick={() => slashMenuStore.triggerCommandByIndex(index)}
          >
            <div class="icon-wrapper"><Icon name={item.icon} size={20} /></div>
            <div class="text-wrapper">
              <span class="title">{item.title}</span>
              <span class="description">{item.description}</span>
            </div>
          </button>
        {/each}
      </div>
    {:else}
      <div class="empty-state">No hay resultados</div>
    {/if}
  </div>
{/if}

<style>
  .slash-menu-container {
    will-change: transform, opacity;
    transition: opacity 0.1s ease-in-out;
    outline: none;
    background-color: var(--color-background);
    border: 1px solid var(--color-gray-100);
    border-radius: var(--space-md); /* Aumentado para un look más moderno */
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    min-width: 320px; /* Ancho ajustado */
    max-height: 400px; /* Altura máxima para evitar desbordes */
    z-index: 70;
    overflow: hidden; /* Ocultar desbordes */
  }

  .group-tabs {
    display: flex;
    flex-shrink: 0;
    padding: var(--space-xs);
    gap: var(--space-xs);
    border-bottom: 1px solid var(--color-gray-100);
  }

  .group-tab {
    flex: 1;
    padding: var(--space-sm) 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-gray-500);
    background: none;
    border: none;
    border-radius: var(--space-xs);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .group-tab.is-active,
  .group-tab:hover {
    color: var(--color-text);
  }

  .group-tab.is-active {
    background-color: var(--color-gray-100);
  }

  .items-list {
    flex-grow: 1;
    overflow-y: auto;
    padding: var(--space-xs);
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
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    background-color: var(--color-gray-100);
    border-radius: var(--space-xs);
    transition:
      background-color 0.2s,
      color 0.2s;
    flex-shrink: 0;
  }

  .text-wrapper {
    display: flex;
    flex-direction: column;
  }

  .title {
    font-weight: 500;
  }

  .description {
    font-size: 0.8rem;
    color: var(--color-gray-500);
  }

  .menu-item.is-selected .icon-wrapper {
    background-color: var(--color-accent);
    color: white;
  }

  .empty-state {
    padding: var(--space-lg); /* Más espaciado */
    text-align: center;
    color: var(--color-gray-500);
    font-style: italic;
    font-size: 0.9rem;
  }

  @media (prefers-color-scheme: dark) {
    .menu-item.is-selected,
    .group-tab.is-active {
      background-color: var(--color-gray-100);
    }
    .icon-wrapper {
      background-color: var(--color-gray-100);
    }
    .group-tab:hover {
      color: white;
    }
    .menu-item.is-selected .icon-wrapper {
      background-color: var(--color-accent);
      color: var(--color-background);
    }
  }
</style>
