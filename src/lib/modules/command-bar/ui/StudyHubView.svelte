<!--
  @component
  StudyHubView

  @description
  The central dashboard for all Spaced Repetition (SRS) activities.
  It provides a high-level overview of all decks, their status (New, Learning, Due),
  and allows users to start reviews or configure deck settings.

  Features:
  - **Deck Statistics:** Aggregates real-time counts of cards in different learning stages.
  - **Grid Layout:** Uses a responsive grid to display tabular data cleanly.
  - **Loading Skeletons:** Shows a placeholder UI while statistics are being calculated.
  - **Actions:** Quick access to "Start Review" (click row) and "Deck Options" (settings icon).
-->
<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import ViewHeader from './ViewHeader.svelte';
  import {
    setView,
    close as closeCommandBar,
  } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { startReview } from '$lib/stores/reviewStore.svelte';
  import * as reviewService from '$lib/modules/study/domain/reviewService';

  // --- Types ---
  type DeckStat = { title: string; new: number; learning: number; due: number };

  // --- State ---
  let deckStats = $state<Map<string, DeckStat>>(new Map());
  let isLoading = $state(true);

  // --- Effects ---

  // Load statistics on mount
  $effect(() => {
    async function loadData() {
      isLoading = true;
      // Simulate a minimum load time for smoother UX (prevents flash)
      await new Promise((resolve) => setTimeout(resolve, 300));
      deckStats = await reviewService.getAllDeckStats();
      isLoading = false;
    }
    loadData();
  });

  // --- Actions ---

  /**
   * Launches a review session specifically for the selected deck.
   */
  function startSingleDeckReview(deckId: string) {
    startReview([deckId]);
    closeCommandBar();
  }
</script>

<div class="view-container">
  <ViewHeader title={i18n.t('studyHub.title')} onBack={() => setView('main')}>
    <Button
      variant="secondary"
      size="sm"
      onclick={() => setView('statistics')}
      aria-label={i18n.t('studyHub.viewStatisticsAria')}
    >
      <Icon name="activity" size={14} />
      {i18n.t('studyHub.viewStatistics')}
    </Button>
  </ViewHeader>

  <div class="content-area">
    {#if isLoading}
      <!-- Skeleton Loading State -->
      <div class="deck-grid" aria-live="polite" aria-busy="true">
        {#each { length: 3 } as _, i (i)}
          <div class="skeleton deck-title-skeleton"></div>
          <div class="skeleton deck-count-skeleton"></div>
          <div class="skeleton deck-count-skeleton"></div>
          <div class="skeleton deck-count-skeleton"></div>
          <div class="skeleton deck-actions-skeleton"></div>
        {/each}
      </div>
    {:else if deckStats.size === 0}
      <!-- Empty State -->
      <div class="state-message">{i18n.t('studyHub.empty')}</div>
    {:else}
      <!-- Data Grid -->
      <div class="deck-grid" role="grid">
        <!-- Header Row -->
        <div class="header-cell" role="columnheader">
          {i18n.t('studyHub.deckHeader')}
        </div>
        <div class="header-cell new" role="columnheader">
          {i18n.t('studyHub.newHeader')}
        </div>
        <div class="header-cell learning" role="columnheader">
          {i18n.t('studyHub.learningHeader')}
        </div>
        <div class="header-cell due" role="columnheader">
          {i18n.t('studyHub.reviewHeader')}
        </div>
        <div class="header-cell" role="columnheader">
          <span class="visually-hidden">{i18n.t('studyHub.actionsHeader')}</span>
        </div>

        <!-- Deck Rows -->
        {#each [...deckStats.entries()] as [deckId, stats] (deckId)}
          <button
            class="deck-row"
            role="row"
            onclick={() => startSingleDeckReview(deckId)}
          >
            <div class="deck-cell deck-title" role="gridcell">
              {stats.title}
            </div>
            <div class="deck-cell deck-count new" role="gridcell">
              {stats.new}
            </div>
            <div class="deck-cell deck-count learning" role="gridcell">
              {stats.learning}
            </div>
            <div class="deck-cell deck-count due" role="gridcell">
              {stats.due}
            </div>
            <div class="deck-cell deck-actions" role="gridcell">
              <Button
                variant="icon"
                size="sm"
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  setView('deck-options', { deckId });
                }}
                aria-label={i18n.t('studyHub.settingsAria')}
              >
                <Icon name="settings" size={16} />
              </Button>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    white-space: nowrap;
  }

  .view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(.back-button) {
    width: auto !important;
    padding: 8px !important;
  }

  .content-area {
    overflow-y: auto;
    padding: var(--space-xs);
  }

  .state-message {
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-secondary);
  }

  .deck-grid {
    display: grid;
    /* Flexible columns: Title takes space, counts fit content, actions auto */
    grid-template-columns: minmax(0, 1fr) repeat(3, minmax(60px, max-content)) auto;
    gap: var(--space-xs) var(--space-sm);
    align-items: center;
  }

  .header-cell {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    text-align: center;
    padding-bottom: var(--space-xs);
  }

  .header-cell:first-child {
    text-align: left;
    padding-left: var(--space-sm);
  }

  .deck-row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid; /* Inherit grid track from parent */
    align-items: center;
    width: 100%;
    padding: 0;
    margin: 0;
    border: none;
    background: none;
    border-radius: var(--border-radius-md);
    cursor: pointer;
    text-align: left;
    transition: background-color 0.2s ease;
  }

  .deck-row:hover,
  .deck-row:focus-visible {
    background-color: var(--btn-hover-bg);
    outline: none;
  }

  .deck-row:focus-visible {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  .deck-cell {
    padding: var(--space-sm) 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .deck-title {
    justify-content: flex-start;
    font-weight: 500;
    color: var(--color-text);
    padding-left: var(--space-sm);
  }

  .deck-row:hover .deck-title,
  .deck-row:focus-visible .deck-title {
    color: var(--color-accent);
  }

  .deck-count {
    font-weight: 600;
  }

  .deck-actions {
    justify-self: end;
    padding-right: var(--space-xs);
  }

  /* Status Colors */
  .new { color: var(--color-accent); }
  .learning { color: var(--color-danger); }
  .due { color: var(--color-green-500); }

  /* Skeleton Loader */
  .skeleton {
    background-color: var(--color-gray-100);
    border-radius: 4px;
    color: transparent !important;
    user-select: none;
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    50% { opacity: 0.5; }
  }

  .deck-title-skeleton { height: 20px; width: 80%; }
  .deck-count-skeleton { height: 20px; width: 50%; margin: 0 auto; }
  .deck-actions-skeleton { background-color: transparent !important; }

  /* Dark Theme */
  :global(.dark-theme) .deck-row:hover,
  :global(.dark-theme) .deck-row:focus-visible {
    background-color: var(--btn-hover-bg-dark);
  }
  :global(.dark-theme) .skeleton {
    background-color: var(--color-gray-800);
  }
</style>
