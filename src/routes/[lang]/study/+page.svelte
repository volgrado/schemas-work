<!-- src/routes/[lang]/study/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { reviewStore } from '$lib/stores/reviewStore';
  import * as reviewService from '$lib/services/features/reviewService';
  import CardBrowser from '$lib/components/study/CardBrowser.svelte'; // We will create this next
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  type DeckStat = { title: string; due: number; new: number };
  let deckStats = $state<Map<string, DeckStat>>(new Map());
  let currentView: 'decks' | 'browser' = $state('decks');
  let selectedDecks = $state<Set<string>>(new Set());

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
      // You might want to navigate away or have the reviewStore handle UI changes
    }
  }
</script>

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
              <Button
                onclick={() => reviewStore.startReview([deckId])}
                size="sm"
                variant="secondary">Study</Button
              >
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <CardBrowser />
    {/if}
  </main>
</div>

<style>
  /* Add styling for your study hub */
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
</style>
