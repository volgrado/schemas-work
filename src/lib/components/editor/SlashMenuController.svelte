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
  import {
    slashMenuState,
    setActiveGroup,
    triggerCommandByIndex,
  } from '$lib/stores/slashMenuStore.svelte';
  import Icon from '$lib/components/core/Icon.svelte';
  import { t } from '$lib/utils/i18n';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { tick } from 'svelte';

  // --- UI Primitives ---
  import Popup from '$lib/components/core/Popup.svelte';

  // --- State ---
  let itemsListEl = $state<HTMLDivElement | undefined>();

  $effect(() => {
    // This effect ensures the selected item is always visible for keyboard navigation.
    if (!slashMenuState.isOpen || !itemsListEl) return;

    const index = slashMenuState.selectedIndex;
    
    tick().then(() => {
       const selectedItem = itemsListEl?.querySelector<HTMLElement>('.is-selected');
       if (selectedItem) {
         selectedItem.scrollIntoView({ block: 'nearest' });
       }
    });
  });
</script>

<Popup
  isVisible={slashMenuState.isOpen}
  getReferenceClientRect={slashMenuState.clientRect
    ? () => slashMenuState.clientRect?.() ?? new DOMRect()
    : null}
  placement="bottom-start"
  offsetValue={8}
>
  <div
    class="slash-menu-container"
    role="dialog"
    aria-label={$t('slash_menu.aria_label')}
    transition:fly={{ y: 10, duration: 200, easing: quintOut }}
  >
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
            {#if index === slashMenuState.activeGroupIndex}
              <div class="active-indicator" transition:fade={{ duration: 150 }}></div>
            {/if}
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
            <div class="icon-wrapper">
              <Icon name={item.icon} size={18} />
            </div>
            <div class="text-wrapper">
              <span class="title">{item.title}</span>
              <span class="description">{item.description}</span>
            </div>
            {#if index === slashMenuState.selectedIndex}
              <div class="enter-hint">
                <Icon name="corner-down-left" size={12} />
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <Icon name="search" size={24} class="text-muted mb-2" />
        <p>{$t('slash_menu.empty_state')}</p>
      </div>
    {/if}
  </div>
</Popup>

<style>
  .slash-menu-container {
    outline: none;
    /* Premium Glassmorphism */
    background: var(--glass-bg);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-xl), 0 0 0 1px rgba(255, 255, 255, 0.1);
    
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    min-width: 320px;
    max-width: 360px;
    max-height: 380px;
    z-index: var(--z-dropdown);
    overflow: hidden;
    padding: var(--space-xs);
  }

  /* --- Tabs --- */
  .group-tabs {
    display: flex;
    flex-shrink: 0;
    padding: var(--space-xs) var(--space-xs) var(--space-sm);
    gap: var(--space-xs);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-xs);
    overflow-x: auto;
    /* Hide scrollbar */
    scrollbar-width: none; 
    -ms-overflow-style: none;
  }
  .group-tabs::-webkit-scrollbar {
    display: none;
  }

  .group-tab {
    position: relative;
    padding: 6px 12px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .group-tab:hover {
    color: var(--color-text);
    background-color: var(--color-background-raised);
  }

  .group-tab.is-active {
    color: var(--color-accent);
    background-color: hsla(var(--color-accent-hsl) / 0.1);
  }

  /* --- Items List --- */
  .items-list {
    flex-grow: 1;
    overflow-y: auto;
    padding: 0 var(--space-xs) var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-text);
    transition: all 0.15s ease;
    position: relative;
  }

  .menu-item:hover {
    background-color: var(--color-background-raised);
  }

  .menu-item.is-selected {
    background-color: var(--color-background-raised);
    border-color: var(--color-border);
    box-shadow: var(--shadow-sm);
  }

  .menu-item.is-selected .icon-wrapper {
    background-color: var(--color-accent);
    color: white;
    transform: scale(1.05);
    box-shadow: 0 2px 8px hsla(var(--color-accent-hsl) / 0.4);
  }

  .icon-wrapper {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    background-color: var(--color-gray-100);
    border-radius: var(--radius-md);
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    flex-shrink: 0;
    color: var(--color-text-secondary);
  }

  .text-wrapper {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0; /* For truncation */
  }

  .title {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .description {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .enter-hint {
    opacity: 0.5;
    color: var(--color-text-tertiary);
    display: flex;
    align-items: center;
  }

  /* --- Empty State --- */
  .empty-state {
    padding: var(--space-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }
  
  .mb-2 {
    margin-bottom: var(--space-sm);
  }

  /* --- Dark Mode Adjustments --- */
  :global(.dark-theme) .slash-menu-container {
    background: rgba(22, 20, 29, 0.85);
    border-color: var(--color-border);
  }
  
  :global(.dark-theme) .menu-item.is-selected {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
</style>
