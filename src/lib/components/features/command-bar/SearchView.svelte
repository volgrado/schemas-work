<!-- src/lib/components/ui/command-bar/SearchView.svelte -->
<script lang="ts">
  import { close as closeCommandBar } from '$lib/stores/commandBarStore.svelte';
  // VVVV CORRECTED IMPORT VVVV
  import { load as loadDocument } from '$lib/stores/documentStore.svelte';
  import { debounce } from '$lib/utils/debounce';
  import { performSearch } from '$lib/services/features/searchService';
  import type { SearchOptions } from '$lib/services/features/commandService';
  import type { Search } from '$lib/types';
  type Command = Search.Command;
  type ContentSearchResult = Search.ContentResult;
  type ResultItem = Search.ResultItem;
  type SearchResultGroup = Search.ResultGroup;
  import {
    getRecentSearches,
    addRecentSearch,
  } from '$lib/services/features/recentSearchesService';
  import Icon from '$lib/components/core/Icon.svelte';
  import { t } from '$lib/utils/i18n';
  import { highlightText } from '$lib/utils/highlight';

  // --- Props ---
  let { query = $bindable(), openApiKeyModal } = $props<{
    query: string;
    openApiKeyModal: () => void;
  }>();

  // --- Exposed State & Methods ---
  let status: 'idle' | 'loading' | 'done' | 'error' = $state('idle');
  export { status };

  // --- Internal State ---
  let resultGroups = $state<SearchResultGroup[]>([]);
  let recentSearches = $state<string[]>([]);
  let activeIndex = $state(0);
  let resultsContainerElement = $state<HTMLDivElement | null>(null);

  // --- Derived State ---
  const flatList = $derived(
    query.trim().length === 0
      ? recentSearches
      : resultGroups.flatMap((group) => group.items)
  );

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
      for (let i = 0; i < currentFlatList.length; i++) {
        const item = currentFlatList[nextIndex];
        if (typeof item === 'string') return nextIndex;
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
            query = selectedItem;
          } else {
            handleItemSelect(selectedItem);
          }
        }
        break;
    }
  }

  const runSearch = debounce(async (searchText: string) => {
    status = 'loading';
    try {
      const commandOptions: SearchOptions = { openApiKeyModal };
      resultGroups = await performSearch(searchText, commandOptions);
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

  function handleItemSelect(item: ResultItem) {
    if ('action' in item) {
      const isEnabled = !item.isEnabled || item.isEnabled();
      if (isEnabled) {
        item.action();
      }
    } else {
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
  $effect(() => {
    recentSearches = getRecentSearches();
  });

  $effect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      runSearch(trimmedQuery);
    } else {
      status = 'idle';
      resultGroups = [];
    }
    activeIndex = 0;
  });

  $effect(() => {
    if (!resultsContainerElement) return;
    const activeElement = resultsContainerElement.querySelector(
      `[data-index="${activeIndex}"]`
    ) as HTMLElement;
    if (activeElement) {
      activeElement.scrollIntoView({ block: 'nearest' });
    }
  });
</script>

<div
  class="results-container"
  bind:this={resultsContainerElement}
  role="listbox"
>
  {#if query.trim().length === 0 && recentSearches.length > 0}
    <div class="results-group">
      <h3 class="group-title">{$t('search_view.recent_searches')}</h3>
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

  {#if resultGroups.length > 0}
    {#each resultGroups as group, groupIndex (group.type)}
      <div class="results-group">
        <h3 class="group-title">
          {group.type === 'Commands'
            ? $t('search_view.group.commands')
            : $t('search_view.group.knowledge')}
        </h3>
        {#each group.items as item, itemIndexInGroup}
          {@const flatIndex = groupStartIndices()[groupIndex] + itemIndexInGroup}
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
                    title={$t('search_view.relevancy_score_tooltip')}
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
                  {@html highlightText(parsed.term, query)}
                </div>
                {#if parsed.description}
                  <div class="result-description">
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

  {#if flatList.length === 0 && query.trim().length === 0 && recentSearches.length === 0}
    <div class="status-text">{$t('search_view.prompt')}</div>
  {:else if status === 'error'}
    <div class="status-text">{$t('search_view.error')}</div>
  {:else if status === 'done' && flatList.length === 0 && query.trim().length > 0}
    <div class="status-text">{$t('search_view.no_results')}</div>
  {/if}
</div>

<style>
  /* All styles are unchanged and correct */
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
