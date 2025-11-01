<script lang="ts">
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { debounce } from '$lib/utils/debounce';
  import { performSearch } from '$lib/services/features/searchService';
  import type { SearchResult as ContentResult } from '$lib/services/features/searchService';
  import type {
    SearchOptions,
    AiActionHandler,
  } from '$lib/services/features/commandService';
  import type {
    Command,
    SearchResultGroup,
    ResultItem,
  } from '$lib/types/command';
  import {
    getRecentSearches,
    addRecentSearch,
  } from '$lib/services/features/recentSearchesService';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';
  import { fly } from 'svelte/transition';
  import { highlightText } from '$lib/utils/highlight';

  // --- Props (Svelte 5 Runes Syntax) ---
  const { openApiKeyModal, handleAiAction } = $props<{
    openApiKeyModal: () => void;
    handleAiAction: AiActionHandler;
  }>();

  // --- State ---
  let query = $state('');
  let status: 'idle' | 'loading' | 'done' | 'error' = $state('idle');
  let resultGroups = $state<SearchResultGroup[]>([]);
  let recentSearches = $state<string[]>([]);
  let activeIndex = $state(0);

  // --- DOM References ---
  let inputElement: HTMLInputElement;
  let resultsContainerElement: HTMLDivElement;

  // --- Derived State ---
  const flatList = $derived(
    query.trim().length === 0
      ? recentSearches
      : resultGroups.flatMap((group) => group.items)
  );

  const groupStartIndices = $derived(() => {
    const indices = [0]; // First group always starts at index 0
    for (let i = 0; i < resultGroups.length - 1; i++) {
      const previousEnd = indices[i] + resultGroups[i].items.length;
      indices.push(previousEnd);
    }
    return indices;
  });

  // --- Effects ---
  $effect(() => {
    recentSearches = getRecentSearches();
    inputElement?.focus();
  });

  const runSearch = debounce(async (searchText: string) => {
    status = 'loading';
    try {
      const commandOptions: SearchOptions = { openApiKeyModal, handleAiAction };
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

  $effect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      status = 'loading';
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

  // --- Event Handlers ---
  function handleItemSelect(item: ResultItem) {
    if ('action' in item) {
      // It's a Command
      item.action();
    } else {
      // It's a ContentResult
      documentStore.loadDocument(item.docId);
      commandBarStore.close();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (flatList.length === 0 && !['Escape'].includes(event.key)) return;

    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
      event.preventDefault();
    } else {
      return; // Allow normal typing
    }

    function findNextEnabled(startIndex: number, direction: 1 | -1): number {
      let nextIndex =
        (startIndex + direction + flatList.length) % flatList.length;
      for (let i = 0; i < flatList.length; i++) {
        const item = flatList[nextIndex];
        if (typeof item === 'string' || !('isEnabled' in item))
          return nextIndex;
        if (item.isEnabled ? item.isEnabled() : true) return nextIndex;
        nextIndex = (nextIndex + direction + flatList.length) % flatList.length;
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
            const isEnabled =
              'isEnabled' in selectedItem
                ? selectedItem.isEnabled
                  ? selectedItem.isEnabled()
                  : true
                : true;
            if (isEnabled) handleItemSelect(selectedItem);
          }
        }
        break;
      case 'Escape':
        commandBarStore.close();
        break;
    }
  }

  // --- Helper Functions ---
  function getResultKey(result: ContentResult) {
    return `${result.docId}-${result.snippet}`;
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
</script>

<div
  class="search-view-container"
  role="dialog"
  aria-modal="true"
  aria-label="Command palette"
>
  <div class="input-wrapper">
    <Icon name="search" size={18} />
    <input
      bind:this={inputElement}
      type="text"
      bind:value={query}
      placeholder={$t('command.search_vault')}
      class="search-input"
      onkeydown={handleKeyDown}
      role="combobox"
      aria-expanded="true"
      aria-controls="results-list"
      aria-activedescendant={flatList.length > 0
        ? `item-${activeIndex}`
        : undefined}
    />
    {#if status === 'loading'}
      <div class="spinner"></div>
    {/if}
  </div>

  <div
    class="results-container"
    bind:this={resultsContainerElement}
    id="results-list"
    role="listbox"
  >
    <!-- Idle State: Recent Searches -->
    {#if query.trim().length === 0 && recentSearches.length > 0}
      <div
        class="results-group"
        role="group"
        aria-labelledby="recent-searches-title"
      >
        <h3 class="group-title" id="recent-searches-title">Recent Searches</h3>
        {#each recentSearches as searchTerm, index (searchTerm)}
          <button
            id="item-{index}"
            class="result-item recent-item"
            class:is-active={index === activeIndex}
            data-index={index}
            onclick={() => (query = searchTerm)}
            onmouseenter={() => (activeIndex = index)}
            in:fly={{ y: 10, duration: 200, delay: index * 20 }}
            role="option"
            aria-selected={index === activeIndex}
          >
            <div class="result-icon"><Icon name="history" size={18} /></div>
            <div class="result-content"><span>{searchTerm}</span></div>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Search State: Grouped Results -->
    {#if resultGroups.length > 0}
      {#each resultGroups as group, groupIndex (group.type)}
        <div
          class="results-group"
          role="group"
          aria-labelledby={`${group.type}-title`}
        >
          <h3 class="group-title" id={`${group.type}-title`}>{group.type}</h3>
          {#each group.items as item, itemIndexInGroup}
            {@const flatIndex =
              groupStartIndices()[groupIndex] + itemIndexInGroup}
            {#if group.type === 'Commands'}
              {@const command = item as Command}
              {@const enabled = command.isEnabled ? command.isEnabled() : true}
              <button
                id="item-{flatIndex}"
                class="result-item"
                class:is-active={flatIndex === activeIndex}
                data-index={flatIndex}
                onclick={command.action}
                onmouseenter={() => {
                  if (enabled) activeIndex = flatIndex;
                }}
                disabled={!enabled}
                in:fly={{ y: 10, duration: 200, delay: flatIndex * 15 }}
                role="option"
                aria-selected={flatIndex === activeIndex}
              >
                <div class="result-icon">
                  <Icon name={command.icon} size={18} />
                </div>
                <div class="result-content"><span>{command.label}</span></div>
              </button>
            {:else if group.type === 'Knowledge'}
              {@const content = item as ContentResult}
              {@const parsed = parseSnippet(content.snippet)}
              <button
                id="item-{flatIndex}"
                class="result-item"
                class:is-active={flatIndex === activeIndex}
                data-index={flatIndex}
                onclick={() => handleItemSelect(content)}
                onmouseenter={() => (activeIndex = flatIndex)}
                in:fly={{ y: 10, duration: 200, delay: flatIndex * 15 }}
                role="option"
                aria-selected={flatIndex === activeIndex}
              >
                <div class="result-icon">
                  <Icon name="file-text" size={20} />
                </div>
                <div class="result-content">
                  <div class="result-header">
                    <span class="result-title">{content.title}</span>
                    <span class="result-score" title="Relevancy score"
                      >{Math.round(content.score * 100)}%</span
                    >
                  </div>
                  {#if content.path}
                    <div class="result-path">
                      <Icon name="folder-open" size={12} /><span
                        >{content.path}</span
                      >
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

    <!-- Status Messages for empty/error states -->
    {#if flatList.length === 0 && query.trim().length === 0 && recentSearches.length === 0}
      <div class="status-text">{$t('search_view.prompt')}</div>
    {:else if status === 'error'}
      <div class="status-text">{$t('search_view.error')}</div>
    {:else if status === 'done' && flatList.length === 0 && query.trim().length > 0}
      <div class="status-text">{$t('search_view.no_results')}</div>
    {/if}
  </div>
</div>

<style>
  .search-view-container:focus {
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
  .search-view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .search-input {
    flex-grow: 1;
    border: none;
    background: none;
    font-size: 1rem;
    color: var(--color-text);
    outline: none;
  }
  .results-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 8px;
    min-height: 0;
  }
  .status-text {
    text-align: center;
    padding: 40px;
    color: var(--color-text-muted);
  }
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-accent);
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
  }
  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  :global(.dark-theme) .input-wrapper {
    border-color: var(--panel-border-dark);
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
  }
  .result-item:hover {
    background-color: var(--btn-hover-bg);
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
  .recent-item .result-content,
  .result-item .result-content span {
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
    align-self: flex-start;
  }
  .result-score {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    background-color: var(--color-background-faint);
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .result-term {
    font-weight: 500;
    color: var(--color-text);
    font-size: 0.9rem;
    align-self: flex-start;
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
    align-self: flex-start;
  }
  :global(.result-term mark),
  :global(.result-description mark) {
    background-color: hsl(var(--color-accent-hsl) / 0.2);
    color: var(--color-accent-hover);
    font-weight: 600;
    border-radius: 3px;
    padding: 0 2px;
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
</style>
