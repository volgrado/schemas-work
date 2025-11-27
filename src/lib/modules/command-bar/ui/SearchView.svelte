<!--
  @component
  SearchView

  @description
  The interactive search interface for the Command Bar.
  It handles:
  - **Federated Search:** Queries both Commands and Knowledge (Content) via `searchService`.
  - **Recent Searches:** Displays and manages a history of recent queries.
  - **Keyboard Navigation:** Supports Arrow keys for selection and Enter for execution.
  - **Result Highlighting:** Uses `highlightText` to visually emphasize matches.
  - **Debouncing:** Limits search API calls for performance.
-->
<script lang="ts">
  import { debounce } from '$lib/core/utils/debounce';
  import { close as closeCommandBar } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { load as loadDocument } from '$lib/modules/editor/ui/documentStore.svelte';
  import type { Search } from '$lib/types';
  import { performSearch } from '$lib/modules/search/domain/searchService';

  import type { SearchOptions } from '$lib/modules/command-bar/domain/commandService';
  import {
    getRecentSearches,
    addRecentSearch,
  } from '$lib/modules/search/domain/recentSearchesService';
  import Icon from '$lib/core/ui/Icon.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
  import { highlightText } from '$lib/utils/highlight';

  type Command = Search.Command;
  type ContentSearchResult = Search.ContentResult;
  type ResultItem = Search.ResultItem;
  type SearchResultGroup = Search.ResultGroup;

  // --- Props ---
  let { query = $bindable(), openApiKeyModal } = $props<{
    query: string;
    openApiKeyModal: () => void;
  }>();

  // --- Exposed State (for parent to check loading) ---
  let status: 'idle' | 'loading' | 'done' | 'error' = $state('idle');
  export { status };

  // --- Internal State ---
  let resultGroups = $state<SearchResultGroup[]>([]);
  let recentSearches = $state<string[]>([]);
  let activeIndex = $state(0);
  let resultsContainerElement = $state<HTMLDivElement | null>(null);

  // --- Derived State ---
  // Flattens the grouped results into a single list for keyboard navigation
  const flatList = $derived(
    query.trim().length === 0
      ? recentSearches
      : resultGroups.flatMap((group) => group.items)
  );

  // Calculate start indices for each group to map flat index back to group index
  const groupStartIndices = $derived(() => {
    const indices: number[] = [];
    let currentIndex = 0;
    for (const group of resultGroups) {
      indices.push(currentIndex);
      currentIndex += group.items.length;
    }
    return indices;
  });

  // --- Methods ---

  /**
   * Handles keyboard navigation (Arrow keys, Enter).
   * Implements "skip disabled items" logic.
   */
  export function handleKeyDown(event: KeyboardEvent) {
    if (flatList.length === 0 && !['Escape'].includes(event.key)) return;
    if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      event.preventDefault();
    } else {
      return;
    }

    function findNextEnabled(startIndex: number, direction: 1 | -1): number {
      const currentFlatList = flatList;
      let nextIndex =
        (startIndex + direction + currentFlatList.length) %
        currentFlatList.length;

      // Iterate to find the next enabled item
      for (let i = 0; i < currentFlatList.length; i++) {
        const item = currentFlatList[nextIndex];
        if (typeof item === 'string') return nextIndex; // Recent searches are always enabled

        // Check 'isEnabled' guard for commands
        if (
          item &&
          'isEnabled' in item &&
          item.isEnabled &&
          !item.isEnabled()
        ) {
          nextIndex =
            (nextIndex + direction + currentFlatList.length) %
            currentFlatList.length;
          continue;
        }
        return nextIndex;
      }
      return startIndex;
    }

    switch (event.key) {
      case 'ArrowDown':
        activeIndex = findNextEnabled(activeIndex, 1);
        break;
      case 'ArrowUp':
        activeIndex = findNextEnabled(activeIndex, -1);
        break;
      case 'Enter':
        const selectedItem = flatList[activeIndex];
        if (selectedItem) {
          if (typeof selectedItem === 'string') {
            query = selectedItem; // Fill query with recent search
          } else {
            handleItemSelect(selectedItem);
          }
        }
        break;
    }
  }

  /**
   * Executes the search logic via `searchService`.
   * Debounced to prevent API thrashing.
   */
  const runSearch = debounce(async (searchText: string) => {
    status = 'loading';
    try {
      const commandOptions: SearchOptions = { openApiKeyModal };
      resultGroups = await performSearch(searchText, commandOptions);

      // Save successful searches that yield knowledge results
      if (
        resultGroups.some((g) => g.type === 'Knowledge' && g.items.length > 0)
      ) {
        addRecentSearch(searchText);
      }
      status = 'done';
    } catch (error) {
      console.error('[Search] The search service failed:', error);
      status = 'error';
      resultGroups = [];
    }
  }, 300);

  /**
   * Executes the action associated with the selected item (Command or Content).
   */
  function handleItemSelect(item: ResultItem) {
    if ('action' in item) {
      // Command
      const isEnabled = !item.isEnabled || item.isEnabled();
      if (isEnabled) {
        item.action();
      }
    } else {
      // Content Result -> Load Document
      loadDocument(item.docId, item.nodeId || null);
      closeCommandBar();
    }
  }

  function parseSnippet(snippet: string): {
    term: string;
    description: string;
  } {
    const parts = snippet.split('\nDescription: ');
    const term = parts[0].replace(/^Term: /, '').trim();
    const description = parts[1] || '';
    return { term, description };
  }

  // --- Effects ---

  // Effect: Sync recent searches on mount/change
  $effect(() => {
    recentSearches = getRecentSearches();
  });

  // Effect: Trigger search when query changes
  $effect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      runSearch(trimmedQuery);
    } else {
      status = 'idle';
      resultGroups = [];
    }
    activeIndex = 0; // Reset selection on new search
  });

  // Effect: Keep active item in view
  $effect(() => {
    if (!resultsContainerElement) return;
    const activeElement = resultsContainerElement.querySelector(
      `[data-index="${activeIndex}"]`
    ) as HTMLElement;
    if (activeElement) {
      activeElement.scrollIntoView({ block: 'nearest' });
    }
  });
  function getItemKey(item: ResultItem, index: number): string | number {
    if ('id' in item) return item.id;
    if ('docId' in item) return item.docId + (item.nodeId || '');
    return index;
  }
</script>

<div
  class="results-container"
  bind:this={resultsContainerElement}
  role="listbox"
>
  <!-- Recent Searches State -->
  {#if query.trim().length === 0 && recentSearches.length > 0}
    <div class="results-group">
      <h3 class="group-title">{i18n.t('search_view.recent_searches')}</h3>
      {#each recentSearches as searchTerm, index (searchTerm)}
        <button
          class="result-item recent-item"
          class:is-active={index === activeIndex}
          data-index={index}
          onclick={() => (query = searchTerm)}
          onmouseenter={() => (activeIndex = index)}
          role="option"
          aria-selected={index === activeIndex}
        >
          <div class="result-icon"><Icon name="history" size={18} /></div>
          <span>{searchTerm}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Search Results State -->
  {#if resultGroups.length > 0}
    {#each resultGroups as group, groupIndex (group.type)}
      <div class="results-group">
        <h3 class="group-title">
          {group.type === 'Commands'
            ? i18n.t('search_view.group.commands')
            : i18n.t('search_view.group.knowledge')}
        </h3>
        {#each group.items as item, itemIndexInGroup (getItemKey(item, itemIndexInGroup))}
          {@const flatIndex =
            groupStartIndices()[groupIndex] + itemIndexInGroup}
          {#if group.type === 'Commands'}
            {@const command = item as Command}
            {@const enabled = command.isEnabled ? command.isEnabled() : true}
            <button
              class="result-item"
              class:is-active={flatIndex === activeIndex}
              data-index={flatIndex}
              onclick={() => handleItemSelect(command)}
              onmouseenter={() => {
                if (enabled) activeIndex = flatIndex;
              }}
              disabled={!enabled}
              role="option"
              aria-selected={flatIndex === activeIndex}
            >
              <div class="result-icon">
                <Icon name={command.icon} size={18} />
              </div>
              <span>{command.label}</span>
            </button>
          {:else if group.type === 'Knowledge'}
            {@const content = item as ContentSearchResult}
            {@const parsed = parseSnippet(content.snippet)}
            <button
              class="result-item"
              class:is-active={flatIndex === activeIndex}
              data-index={flatIndex}
              onclick={() => handleItemSelect(content)}
              onmouseenter={() => (activeIndex = flatIndex)}
              role="option"
              aria-selected={flatIndex === activeIndex}
            >
              <div class="result-icon"><Icon name="file-text" size={20} /></div>
              <div class="result-content">
                <div class="result-header">
                  <span class="result-title">{content.title}</span>
                  <span
                    class="result-score"
                    title={i18n.t('search_view.relevancy_score_tooltip')}
                  >
                    {Math.round(content.score * 100)}%
                  </span>
                </div>
                {#if content.path}
                  <div class="result-path">
                    <Icon name="folder" size={12} /><span>{content.path}</span>
                  </div>
                {/if}
                <div class="result-term">
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  {@html highlightText(parsed.term, query)}
                </div>
                {#if parsed.description}
                  <div class="result-description">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html highlightText(parsed.description, query)}
                  </div>
                {/if}
              </div>
            </button>
          {/if}
        {/each}
      </div>
    {/each}
  {/if}

  <!-- Status Messages -->
  {#if flatList.length === 0 && query.trim().length === 0 && recentSearches.length === 0}
    <div class="status-text">{i18n.t('search_view.prompt')}</div>
  {:else if status === 'error'}
    <div class="status-text">{i18n.t('search_view.error')}</div>
  {:else if status === 'done' && flatList.length === 0 && query.trim().length > 0}
    <div class="status-text">{i18n.t('search_view.no_results')}</div>
  {/if}
</div>

<style>
  .results-container {
    height: 100%;
    overflow-y: auto;
  }
  .status-text {
    text-align: center;
    padding: 40px;
    color: var(--color-text-secondary);
  }
  .result-item {
    display: flex;
    width: 100%;
    gap: 12px;
    padding: 10px;
    border-radius: 6px;
    text-align: left;
    cursor: pointer;
    background: none;
    border: none;
    color: var(--color-text);
    transition: background-color 0.1s ease-in-out;
    outline: none;
  }
  .result-item.is-active {
    background-color: var(--btn-hover-bg);
  }
  .result-item[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .result-item[disabled]:hover {
    background-color: transparent;
  }
  .result-icon {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--color-text-tertiary);
  }
  .result-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }
  .recent-item span {
    align-self: center;
  }
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .result-title {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .result-score {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    background-color: var(--color-background-faint);
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .result-path {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  .result-term {
    font-weight: 500;
    color: var(--color-text);
    font-size: 0.9rem;
  }
  .result-description {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
  .results-group {
    padding: var(--space-sm) 0;
  }
  .group-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 var(--space-sm) var(--space-sm);
    margin: 0;
  }
  :global(.result-term mark),
  :global(.result-description mark) {
    background-color: hsl(var(--color-accent-hsl) / 0.2);
    color: var(--color-accent-hover);
    font-weight: 600;
    border-radius: 3px;
    padding: 0 2px;
  }
  :global(.dark-theme) .result-item.is-active {
    background-color: var(--btn-hover-bg-dark);
  }
</style>
