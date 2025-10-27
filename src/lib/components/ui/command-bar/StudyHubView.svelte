<!--
  @component
  StudyHubView

  An Anki-inspired view within the command bar for browsing and studying decks.
  A "deck" is any document that contains one or more flashcards.

  Features:
  - Lists all available decks in a clean, table-like layout.
  - Displays "New," "Learning," and "To Review" card counts for each deck.
  - Allows starting a study session by clicking a deck's title.
  - Includes a settings button for each deck to configure its review options.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/utils/i18n';

  // --- UI Components ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  // --- Stores & Services ---
  import { commandBarStore } from '$lib/stores/commandBarStore';
  import { reviewStore } from '$lib/stores/reviewStore';
  import * as reviewService from '$lib/services/features/reviewService';

  type DeckStat = { title: string; new: number; learning: number; due: number };

  // --- Component State ---
  let deckStats = $state<Map<string, DeckStat>>(new Map());
  let isLoading = $state(true);

  onMount(async () => {
    isLoading = true;
    deckStats = await reviewService.getAllDeckStats();
    isLoading = false;
  });

  function startSingleDeckReview(deckId: string) {
    reviewStore.startReview([deckId]);
    commandBarStore.close();
  }
</script>

<nav class="action-list study-hub-view" aria-labelledby="study-hub-title">
  <div class="hub-header">
    <h2 id="study-hub-title" class="visually-hidden">{$t('studyHub.title')}</h2>
    <Button
      variant="secondary"
      size="sm"
      onclick={() => commandBarStore.setView('statistics')}
    >
      <Icon name="activity" size={14} />
      {$t('studyHub.viewStatistics')}
    </Button>
  </div>

  {#if isLoading}
    <div class="state-message">{$t('studyHub.loading')}</div>
  {:else if deckStats.size === 0}
    <div class="state-message">
      {$t('studyHub.empty')}
    </div>
  {:else}
    <div class="deck-grid">
      <!-- Header Row -->
      <div class="deck-header-title">{$t('studyHub.deckHeader')}</div>
      <div class="deck-header-count new">{$t('studyHub.newHeader')}</div>
      <div class="deck-header-count learning">
        {$t('studyHub.learningHeader')}
      </div>
      <div class="deck-header-count due">{$t('studyHub.reviewHeader')}</div>
      <div></div>
      <!-- Empty cell for alignment -->

      <!-- Data Rows -->
      {#each [...deckStats.entries()] as [deckId, stats]}
        <div class="deck-title">
          <button
            class="deck-title-button"
            onclick={() => startSingleDeckReview(deckId)}
          >
            {stats.title}
          </button>
        </div>
        <div class="deck-count new">{stats.new}</div>
        <div class="deck-count learning">{stats.learning}</div>
        <div class="deck-count due">{stats.due}</div>
        <div class="deck-actions">
          <Button
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              commandBarStore.setView('deck-options', deckId);
            }}
            size="sm"
            variant="ghost"
            aria-label={$t('studyHub.settingsAria')}
          >
            <Icon name="settings" size={16} />
          </Button>
        </div>
      {/each}
    </div>
  {/if}
</nav>

<hr class="separator" />

<button class="action-button" onclick={() => commandBarStore.setView('main')}>
  <Icon name="x" size={18} />
  <span>{$t('file_explorer.footer.back_to_main_menu')}</span>
</button>

<style>
  .hub-header {
    display: flex;
    justify-content: flex-end;
    padding: 0 var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--panel-border-light);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
  .study-hub-view {
    gap: var(--space-sm);
  }
  .state-message {
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-secondary);
  }
  .deck-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 60px 70px 80px auto;
    align-items: center;
    gap: var(--space-xs) var(--space-sm);
  }
  .deck-grid > div {
    padding: var(--space-sm) 0;
  }
  .deck-grid .deck-header-title,
  .deck-grid .deck-header-count {
    border-bottom: 1px solid var(--panel-border-light);
  }

  .deck-header-title {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    text-align: left;
    padding-bottom: var(--space-xs);
  }
  .deck-header-count {
    font-weight: 600;
    font-size: 0.8rem;
    text-align: center;
    padding-bottom: var(--space-xs);
  }
  .deck-title-button {
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    width: 100%;
    padding: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-radius: 4px; /* For focus outline */
    outline-offset: 2px;
  }
  .deck-title-button:hover {
    color: var(--color-accent);
  }
  .deck-count {
    font-weight: 600;
    text-align: center;
  }
  .deck-actions {
    justify-self: end;
  }
  .new {
    color: var(--color-blue-500);
  }
  .learning {
    color: var(--color-danger);
  }
  .due {
    color: var(--color-green-500);
  }
  .separator {
    border: none;
    height: 1px;
    background-color: var(--panel-border-light);
    margin: var(--space-sm) 0;
  }
  :global(.dark-theme) .hub-header,
  :global(.dark-theme) .deck-grid .deck-header-title,
  :global(.dark-theme) .deck-grid .deck-header-count {
    border-color: var(--panel-border-dark);
  }
  :global(.dark-theme) .separator {
    background-color: var(--panel-border-dark);
  }
</style>
