<!--
  @component
  SlashMenuController

  @description
  An exceptional, production-ready implementation of the floating slash command menu.
  This component is a pure view, driven entirely by the `slashMenuStore`. It leverages
  the `Popup` UI primitive to handle all complex positioning logic, making the component
  itself simple, declarative, and robust.
-->
<script lang="ts">
  // FIX: Import the state rune and action functions directly from the store.
  import {
    slashMenuState,
    setActiveGroup,
    triggerCommandByIndex,
  } from '$lib/stores/slashMenuStore.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';
  import { fade } from 'svelte/transition';

  // --- UI Primitives ---
  import Popup from '$lib/components/ui/Popup.svelte';

  // --- State ---
  let itemsListEl = $state<HTMLDivElement | undefined>();

  $effect(() => {
    // This effect ensures the selected item is always visible for keyboard navigation.
    // By referencing `slashMenuState.selectedIndex` and `slashMenuState.isOpen`,
    // the effect will re-run automatically when they change.
    if (!slashMenuState.isOpen || !itemsListEl) return;

    const selectedItem = itemsListEl.querySelector<HTMLElement>('.is-selected');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  });
</script>

<Popup
  isVisible={slashMenuState.isOpen}
  getReferenceClientRect={slashMenuState.clientRect
    ? () => slashMenuState.clientRect?.() ?? new DOMRect()
    : null}
  placement="bottom-start"
  offsetValue={4}
>
  <div
    class="slash-menu-container"
    role="dialog"
    aria-label={$t('slash_menu.aria_label')}
    transition:fade={{ duration: 100 }}
  >
    <!-- FIX: Access rune state directly without the '$' prefix. -->
    {#if slashMenuState.allItems.length > 0}
      <div class="group-tabs" role="tablist">
        {#each slashMenuState.groups as group, index}
          <button
            class="group-tab"
            class:is-active={index === slashMenuState.activeGroupIndex}
            onclick={() => setActiveGroup(index)}
            role="tab"
            aria-selected={index === slashMenuState.activeGroupIndex}
          >
            {group}
          </button>
        {/each}
      </div>
      <div class="items-list" bind:this={itemsListEl} role="listbox">
        {#each slashMenuState.filteredItems as item, index (item.title)}
          <button
            class="menu-item"
            class:is-selected={index === slashMenuState.selectedIndex}
            onclick={() => triggerCommandByIndex(index)}
            role="option"
            aria-selected={index === slashMenuState.selectedIndex}
            id={`slash-item-${index}`}
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
      <div class="empty-state">{$t('slash_menu.empty_state')}</div>
    {/if}
  </div>
</Popup>

<style>
  /* All styles remain the same and are correct. */
  /* All styles remain the same and are correct. */
  .slash-menu-container {
    outline: none;
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    min-width: var(--width-panel-sm);
    max-width: 360px;
    max-height: 40vh;
    z-index: var(--z-dropdown);
    overflow: hidden;
  }
  .group-tabs {
    display: flex;
    flex-shrink: 0;
    padding: var(--space-xs);
    gap: var(--space-xs);
    border-bottom: 1px solid var(--color-border);
  }
  .group-tab {
    flex: 1;
    padding: var(--space-sm) 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition-fast);
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
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-text);
    transition: var(--transition-fast);
  }
  .menu-item.is-selected {
    background-color: var(--btn-hover-bg);
  }
  .icon-wrapper {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    background-color: var(--color-gray-100);
    border-radius: var(--radius-sm);
    transition:
      background-color 0.2s,
      color 0.2s;
    flex-shrink: 0;
    color: var(--color-text-secondary);
  }
  .text-wrapper {
    display: flex;
    flex-direction: column;
  }
  .title {
    font-weight: 500;
    font-size: var(--font-size-sm);
  }
  .description {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
  .menu-item.is-selected .icon-wrapper {
    background-color: var(--color-accent);
    color: white;
  }
  .empty-state {
    padding: var(--space-lg);
    text-align: center;
    color: var(--color-text-secondary);
    font-style: italic;
    font-size: var(--font-size-sm);
  }
</style>
