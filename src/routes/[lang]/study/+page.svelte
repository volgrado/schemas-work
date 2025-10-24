<!--
  @file src/routes/[lang]/study/+page.svelte
  @description This page serves as the "Study Hub," a central dashboard for all study-related activities.
  It provides multiple views for users to manage their learning materials and track their progress.

  Key Features:
  - **View Toggling**: The user can switch between three main views:
    1.  **Decks View**: Lists all documents that contain flashcards, showing the number of due and new cards for each.
        Users can select multiple decks for a combined study session or start a review for a single deck. They can
        also access per-deck settings from here.
    2.  **Card Browser View**: Renders the `<CardBrowser />` component, a powerful table-based interface for
        viewing, filtering, sorting, and editing every card in the user's collection.
    3.  **Statistics View**: Renders the `<StatisticsView />` component, which displays charts and metrics
        about the user's study history and performance.
  - **State Management**: It uses Svelte 5 runes (`$state`) for its local component state, such as the `currentView`
    and the set of `selectedDecks`.
  - **Service Integration**: It fetches deck statistics from the `reviewService` on mount to populate the Decks view.
  - **Store Interaction**: It interacts with the `reviewStore` to initiate study sessions based on the user's
    deck selections.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { reviewStore } from '$lib/stores/reviewStore';
  import * as reviewService from '$lib/services/features/reviewService';
  import CardBrowser from '$lib/components/study/CardBrowser.svelte';
  import StatisticsView from '$lib/components/study/StatisticsView.svelte'; // 1. Import
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import DeckOptionsModal from '$lib/components/study/DeckOptionsModal.svelte';

  type DeckStat = { title: string; due: number; new: number };
  let deckStats = $state<Map<string, DeckStat>>(new Map());
  let currentView: 'decks' | 'browser' | 'stats' = $state('decks'); // 2. Update type
  let selectedDecks = $state<Set<string>>(new Set());
  let optionsDeckId = $state<string | null>(null);

  onMount(async () => {
    deckStats = await reviewService.getAllDeckStats();
  });

  function toggleDeckSelection(deckId: string) {
    if (selectedDecks.has(deckId)) {
      selectedDecks.delete(deckId);
    } else {
      selectedDecks.add(deckId);
    }
    selectedDecks = selectedDecks; // Trigger reactivity
  }

  function startSelectedReview() {
    if (selectedDecks.size > 0) {
      reviewStore.startReview(Array.from(selectedDecks));
    }
  }
</script>

{#if optionsDeckId}
  <DeckOptionsModal
    deckId={optionsDeckId}
    onclose={() => (optionsDeckId = null)}
  />
{/if}

<div class="study-hub">
  <header class="hub-header">
    <h1>Study Hub</h1>
    <div class="view-toggle">
      <Button
        variant={currentView === 'decks' ? 'primary' : 'secondary'}
        onclick={() => (currentView = 'decks')}>Decks</Button
      >
      <Button
        variant={currentView === 'browser' ? 'primary' : 'secondary'}
        onclick={() => (currentView = 'browser')}>Card Browser</Button
      >
      <!-- 3. Add Statistics Button -->
      <Button
        variant={currentView === 'stats' ? 'primary' : 'secondary'}
        onclick={() => (currentView = 'stats')}>Statistics</Button
      >
    </div>
  </header>

  <main class="hub-content">
    {#if currentView === 'decks'}
      <div class="decks-view">
        {#if selectedDecks.size > 0}
          <div class="bulk-actions">
            <Button onclick={startSelectedReview} size="sm">
              <Icon name="zap" size={16} />
              Study {selectedDecks.size} selected deck(s)
            </Button>
          </div>
        {/if}
        <div class="deck-list">
          {#each [...deckStats.entries()] as [deckId, stats]}
            <div class="deck-item">
              <input
                type="checkbox"
                onchange={() => toggleDeckSelection(deckId)}
                checked={selectedDecks.has(deckId)}
              />
              <div class="deck-info">
                <span class="deck-title">{stats.title}</span>
                <div class="deck-counts">
                  <span>Due: <strong class="due">{stats.due}</strong></span>
                  <span>New: <strong class="new">{stats.new}</strong></span>
                </div>
              </div>
              <div class="deck-actions">
                <Button
                  onclick={() => (optionsDeckId = deckId)}
                  size="sm"
                  variant="ghost"
                >
                  <Icon name="settings" size={16} />
                </Button>
                <Button
                  onclick={() => reviewStore.startReview([deckId])}
                  size="sm"
                  variant="secondary">Study</Button
                >
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else if currentView === 'browser'}
      <CardBrowser />
      <!-- 4. Add block for Statistics View -->
    {:else if currentView === 'stats'}
      <StatisticsView />
    {/if}
  </main>
</div>

<style>
  .study-hub {
    padding: var(--space-lg);
    max-width: 800px;
    margin: 0 auto;
  }
  .hub-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-lg);
  }
  .view-toggle {
    display: flex;
    gap: var(--space-sm);
  }
  .deck-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .deck-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: var(--space-sm);
  }
  .deck-info {
    flex-grow: 1;
  }
  .deck-title {
    font-weight: 600;
  }
  .deck-counts {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-xs);
  }
  .due {
    color: var(--color-blue-500);
  }
  .new {
    color: var(--color-green-500);
  }
  .bulk-actions {
    margin-bottom: var(--space-md);
  }
  .deck-actions {
    display: flex;
    gap: var(--space-xs);
  }
</style>
