<!--
  @component
  SlashMenuController

  This component renders the floating slash command menu within the Tiptap editor.
  It is almost entirely driven by the `slashMenuStore`, which controls its visibility, content (the command items),
  and state (selected item, active group, etc.).

  Key Features:
  - Dynamically positions itself near the user's text cursor.
  - Uses an `$effect` hook to reactively calculate the optimal position, ensuring the menu stays within the viewport.
    It prioritizes appearing below the cursor, but will flip above if space is limited.
  - Renders a list of command items, which can be filtered and grouped by category.
  - Allows navigation and selection of commands via keyboard (handled by the store) and mouse clicks.
  - The component's role is primarily presentational; all the complex logic is managed in `slashMenuStore` and the `SlashCommandExtension`.
-->
<script lang="ts">
  import { slashMenuStore } from '$lib/stores/slashMenuStore';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';

  let menuElement = $state<HTMLElement | undefined>();
  let style = $state('');

  const VIEWPORT_PADDING = 10; // Minimum space between the menu and the edge of the window.
  const CURSOR_OFFSET = 5;     // Vertical offset from the cursor.

  /**
   * This effect hook is the core of the component's dynamic positioning.
   * It runs whenever the menu's state or the editor's cursor position changes.
   */
  $effect(() => {
    if ($slashMenuStore.isOpen && $slashMenuStore.clientRect && menuElement) {
      const rect = $slashMenuStore.clientRect();
      if (!rect) {
        // Hide the menu if the cursor position is not available.
        style = 'opacity: 0; pointer-events: none;';
        return;
      }

      const menuHeight = menuElement.offsetHeight;
      const menuWidth = menuElement.offsetWidth;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      // Calculate potential top positions (above and below the cursor).
      const posBelow = rect.bottom + window.scrollY + CURSOR_OFFSET;
      const posAbove = rect.top + window.scrollY - menuHeight - CURSOR_OFFSET;

      let top: number;

      const hasSpaceBelow = posBelow + menuHeight < windowHeight - VIEWPORT_PADDING;
      const hasSpaceAbove = posAbove > VIEWPORT_PADDING;

      // Prioritize placing the menu below the cursor, but flip above if needed.
      if (hasSpaceBelow) {
        top = posBelow;
      } else if (hasSpaceAbove) {
        top = posAbove;
      } else {
        // Default to below if there's no ideal space (e.g., small screen).
        top = posBelow;
      }

      // Calculate left position, ensuring it doesn't overflow the window horizontally.
      let left = rect.left + window.scrollX;
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
      }
      if (left + menuWidth > windowWidth - VIEWPORT_PADDING) {
        left = windowWidth - menuWidth - VIEWPORT_PADDING;
      }

      // Final boundary check to prevent vertical overflow.
      if (top < VIEWPORT_PADDING) {
        top = VIEWPORT_PADDING;
      }
      if (top + menuHeight > windowHeight - VIEWPORT_PADDING) {
        top = windowHeight - menuHeight - VIEWPORT_PADDING;
      }

      // Apply the calculated position as a transform.
      style = `opacity: 1; transform: translate(${left}px, ${top}px);`;
    } else {
      // Hide the menu when it's not open.
      style = 'opacity: 0; pointer-events: none;';
    }
  });
</script>

<!-- The menu is only in the DOM when the slash command is active -->
{#if $slashMenuStore.isOpen}
  <div
    class="slash-menu-container"
    bind:this={menuElement}
    style="position: absolute; top: 0; left: 0; {style}"
  >
    {#if $slashMenuStore.allItems.length > 0}
      <!-- Group tabs for categorizing commands -->
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
      <!-- Scrollable list of command items -->
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
      <!-- State for when the filter query yields no results -->
      <div class="empty-state">{t('slash_menu.empty_state')}</div>
    {/if}
  </div>
{/if}

<style>
  .slash-menu-container {
    will-change: transform, opacity;
    transition: opacity 0.1s ease-in-out;
    outline: none;
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--space-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    min-width: 320px;
    max-height: 400px;
    z-index: 70;
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
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-gray-600);
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

  .items-list { flex-grow: 1; overflow-y: auto; padding: var(--space-xs); }

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

  .menu-item.is-selected { background-color: var(--color-gray-100); }

  .icon-wrapper {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    background-color: var(--color-gray-100);
    border-radius: var(--space-xs);
    transition: background-color 0.2s, color 0.2s;
    flex-shrink: 0;
  }

  .text-wrapper { display: flex; flex-direction: column; }
  .title { font-weight: 500; }
  .description { font-size: 0.8rem; color: var(--color-gray-500); }

  .menu-item.is-selected .icon-wrapper {
    background-color: var(--color-accent);
    color: white;
  }

  .empty-state { padding: var(--space-lg); text-align: center; color: var(--color-gray-500); font-style: italic; font-size: 0.9rem; }

  /* --- Dark Mode --- */
  @media (prefers-color-scheme: dark) {
    .slash-menu-container { border-color: var(--color-border-dark); }
    .group-tabs { border-color: var(--color-border-dark); }
    .group-tab.is-active { background-color: var(--color-gray-800); }
    .menu-item.is-selected { background-color: var(--color-gray-800); }
    .icon-wrapper { background-color: var(--color-gray-800); }
    .group-tab { color: var(--color-gray-400); }
    .group-tab.is-active, .group-tab:hover { color: var(--color-text-dark); }
    .menu-item.is-selected .icon-wrapper { color: var(--color-text-dark); }
  }
</style>
