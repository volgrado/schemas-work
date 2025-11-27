<!--
  @component
  ReviewController

  @description
  The central UI controller for the Spaced Repetition System (SRS) review session.
  This component manages the lifecycle of a review session, rendering appropriate
  card interfaces ('basic', 'input', 'sequencing') based on the current card type.

  It orchestrates:
  - Displaying the question/prompt side of a card.
  - Handling user interactions (revealing answers, typing input, reordering lists).
  - Providing immediate feedback for interactive cards.
  - Submitting review quality scores (0-5) to the `reviewStore`.
  - Showing session progress and a summary screen upon completion.
-->
<script lang="ts">
  // --- Svelte Transition & Animation ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- Core Utilities & Stores ---
  import { i18n } from '$lib/utils/i18n.svelte';
  // Import reactive state and actions directly from the store module
  import {
    reviewState,
    submitInteractiveAnswer,
    submitReview,
    finishReview,
    jumpToSource,
    showAnswer,
  } from '$lib/modules/study/ui/reviewStore.svelte';
  import { evaluateAnswer } from '$lib/modules/study/domain/reviewService';

  // --- UI Components ---
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';

  // --- Types & External Libs ---
  import type { SRS } from '$lib/types';
  import deepEqual from 'deep-eql';

  type ReviewQuality = SRS.ReviewQuality;
  type Card = SRS.Card;

  // --- Local Reactive State (Runes) ---
  let userInput = $state('');
  let userSequence = $state<string[]>([]);
  let draggedItemIndex = $state<number | null>(null);
  let isSubmitting = $state(false);

  // --- Derived State ---
  // Access the global store state directly (no $ prefix needed for imported state objects)
  const currentCard = $derived(
    reviewState.cardsToReview[reviewState.currentCardIndex]
  );

  // Calculate session statistics on the fly
  const sessionProgress = $derived({
    new: reviewState.cardsToReview.filter(
      (c: Card) => !c.srs || c.srs.repetitions === 0
    ).length,
    learning: [...reviewState.cardsToReview, ...reviewState.failedQueue].filter(
      (c: Card) => c.srs?.learningStep > 0
    ).length,
    due: reviewState.cardsToReview.filter(
      (c: Card) => c.srs?.repetitions > 0 && c.srs.learningStep === 0
    ).length,
  });

  // --- Effects ---

  // Effect: Reset local UI state when the card changes
  $effect(() => {
    if (currentCard && currentCard.type === 'sequencing') {
      // Randomize the initial sequence for the user to solve
      userSequence = [...currentCard.content.items].sort(
        () => Math.random() - 0.5
      );
    } else {
      userSequence = [];
    }
    userInput = '';
    isSubmitting = false;
  });

  // --- Interaction Handlers ---

  /**
   * Validates user input for 'input' type cards.
   * Calculates a similarity score and submits it.
   */
  async function handleCheckInput() {
    if (!currentCard || currentCard.type !== 'input' || isSubmitting) return;
    isSubmitting = true;

    const quality = await evaluateAnswer(
      userInput,
      currentCard.content.expected
    );

    // Show immediate visual feedback (Green/Red)
    submitInteractiveAnswer(quality >= 3);

    // Auto-advance after a short delay if correct-ish, or let user review
    setTimeout(() => submitReview(quality), 2000);
  }

  /**
   * Validates the order for 'sequencing' type cards.
   */
  function handleCheckSequence() {
    if (!currentCard || currentCard.type !== 'sequencing') return;
    const isCorrect = deepEqual(userSequence, currentCard.content.items);
    submitInteractiveAnswer(isCorrect);
  }

  // --- Drag and Drop Logic (for Sequencing Cards) ---

  function handleDragStart(index: number) {
    draggedItemIndex = index;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault(); // Allow drop
  }

  function handleDrop(targetIndex: number) {
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      draggedItemIndex = null;
      return;
    }
    const newSequence = [...userSequence];
    const [draggedItem] = newSequence.splice(draggedItemIndex, 1);
    newSequence.splice(targetIndex, 0, draggedItem);
    userSequence = newSequence;
    draggedItemIndex = null;
  }
</script>

<div
  class="review-screen"
  transition:fade={{ duration: 300, easing: quintOut }}
>
  {#if reviewState.isFinished}
    <!-- Session Summary Screen -->
    <div class="completion-screen">
      <h2>{i18n.t('review.congrats_title')}</h2>
      <p>
        {i18n.t('review.session_finished_desc', {
          count: reviewState.sessionCardCount,
        })}
      </p>
      <Button onclick={finishReview} size="lg"
        >{i18n.t('review.finish_button')}</Button
      >
    </div>
  {:else if currentCard}
    <!-- Header Controls (Progress, Exit) -->
    <div class="global-controls">
      <div class="session-progress">
        <span class="new" title={i18n.t('review.progress.new_tooltip')}
          >{sessionProgress.new}</span
        >
        <span
          class="learning"
          title={i18n.t('review.progress.learning_tooltip')}
          >{sessionProgress.learning}</span
        >
        <span class="due" title={i18n.t('review.progress.due_tooltip')}
          >{sessionProgress.due}</span
        >
      </div>
      <Button
        onclick={jumpToSource}
        variant="ghost"
        size="sm"
        aria-label={i18n.t('review.goToSource')}
      >
        <Icon name="file-text" size={16} />
        <span>{i18n.t('review.goToSource')}</span>
      </Button>
      <Button onclick={finishReview} variant="ghost" size="sm">
        {i18n.t('review.finishReview')}
      </Button>
    </div>

    <!-- Main Flashcard Area -->
    <div class="card-panel" in:fly={{ y: 20, duration: 300, easing: quintOut }}>
      <div class="card-content">
        <!-- Type: Basic -->
        {#if currentCard.type === 'basic'}
          <p class="question">{currentCard.content.question}</p>
          {#if reviewState.isAnswerShown}
            <div class="answer" transition:fade>
              <p>{currentCard.content.answer}</p>
            </div>
          {/if}

          <!-- Type: Input -->
        {:else if currentCard.type === 'input'}
          <p class="question">{currentCard.content.prompt}</p>
          <input
            type="text"
            class="input-field"
            placeholder={i18n.t('review.inputPlaceholder')}
            bind:value={userInput}
            disabled={reviewState.isAnswerShown || isSubmitting}
            onkeydown={(e) => e.key === 'Enter' && handleCheckInput()}
          />
          {#if reviewState.isAnswerShown}
            <div
              class="feedback"
              class:correct={reviewState.lastAnswerCorrect}
              class:incorrect={!reviewState.lastAnswerCorrect}
              transition:fade
            >
              {i18n.t('review.correctAnswer')}
              <strong>{currentCard.content.expected}</strong>
            </div>
          {/if}

          <!-- Type: Sequencing -->
        {:else if currentCard.type === 'sequencing'}
          <p class="question">{currentCard.content.prompt}</p>
          <div class="sequence-container" role="list">
            {#each userSequence as item, i (item)}
              <div
                class="sequence-item"
                draggable="true"
                ondragstart={() => handleDragStart(i)}
                ondragover={handleDragOver}
                ondrop={() => handleDrop(i)}
                class:is-dragging={draggedItemIndex === i}
                role="listitem"
              >
                {item}
              </div>
            {/each}
          </div>
          {#if reviewState.isAnswerShown}
            <div
              class:correct={reviewState.lastAnswerCorrect}
              class:incorrect={!reviewState.lastAnswerCorrect}
              class="feedback"
              transition:fade
            >
              {#if reviewState.lastAnswerCorrect}
                {i18n.t('review.correctSequence')}
              {:else}
                <p>{i18n.t('review.correctSequenceIs')}</p>
                <ol>
                  {#each currentCard.content.items as item, i (i)}
                    <li>{item}</li>
                  {/each}
                </ol>
              {/if}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer Actions (Show Answer / Rate Card) -->
      <div class="card-actions">
        {#if !reviewState.isAnswerShown}
          <!-- Initial State: Check/Show Answer buttons -->
          {#if currentCard.type === 'basic'}
            <Button onclick={showAnswer} size="lg">
              {i18n.t('review.showAnswer')}
            </Button>
          {:else if currentCard.type === 'input'}
            <Button
              onclick={handleCheckInput}
              size="lg"
              disabled={isSubmitting}
            >
              {#if isSubmitting}{i18n.t('review.evaluating')}{:else}{i18n.t(
                  'review.check'
                )}{/if}
            </Button>
          {:else if currentCard.type === 'sequencing'}
            <Button onclick={handleCheckSequence} size="lg">
              {i18n.t('review.check')}
            </Button>
          {/if}
        {:else if currentCard.type !== 'input'}
          <!-- Answer Revealed State: Quality Rating Buttons -->
          <div class="review-buttons">
            <Button
              onclick={() => submitReview(0)}
              size="md"
              variant="secondary"
            >
              {i18n.t('review.again')}
            </Button>
            <Button
              onclick={() => submitReview(3)}
              size="md"
              variant="secondary"
            >
              {i18n.t('review.hard')}
            </Button>
            <Button onclick={() => submitReview(4)} size="md" variant="primary">
              {i18n.t('review.good')}
            </Button>
            <Button onclick={() => submitReview(5)} size="md" variant="primary">
              {i18n.t('review.easy')}
            </Button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .review-screen {
    position: fixed;
    inset: 0;
    z-index: 100;
    background-color: var(--color-page-background);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
  }
  .global-controls {
    position: absolute;
    top: var(--space-lg);
    left: var(--space-lg);
    right: var(--space-lg);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .session-progress {
    display: flex;
    gap: var(--space-sm);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .session-progress .new {
    color: var(--color-blue-500);
  }
  .session-progress .learning {
    color: var(--color-danger);
  }
  .session-progress .due {
    color: var(--color-green-500);
  }

  .card-panel {
    background-color: var(--color-background-raised);
    border-radius: var(--space-md);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 600px;
    border: 1px solid var(--color-border);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .card-content {
    padding: var(--space-lg);
    flex-grow: 1;
    min-height: 250px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .question {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: var(--space-md);
  }
  .answer {
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }
  .card-actions {
    background-color: var(--color-background);
    border-top: 1px solid var(--color-border);
    padding: var(--space-sm) var(--space-lg);
    display: flex;
    justify-content: center;
    min-height: 60px;
  }
  .review-buttons {
    display: flex;
    gap: var(--space-sm);
  }
  .input-field {
    width: 100%;
    padding: var(--space-sm);
    font-size: 1rem;
    border-radius: var(--border-radius-sm);
  }
  .feedback {
    margin-top: var(--space-md);
    padding: var(--space-sm);
    border-radius: var(--space-sm);
    font-weight: 500;
    border: 1px solid transparent;
  }
  .feedback.correct {
    background-color: var(--color-success-bg);
    color: var(--color-success-text);
    border-color: var(--color-success-border);
  }
  .feedback.incorrect {
    background-color: var(--color-danger-bg);
    color: var(--color-danger-text);
    border-color: var(--color-danger-border);
  }
  .sequence-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  .sequence-item {
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--space-sm);
    cursor: grab;
    transition:
      background-color 0.2s,
      box-shadow 0.2s;
  }
  .sequence-item:active {
    cursor: grabbing;
  }
  .sequence-item.is-dragging {
    background-color: hsl(var(--color-accent-hsl) / 0.1);
    box-shadow: var(--shadow-lg);
  }
  .completion-screen {
    text-align: center;
  }

  :global(.dark-theme) .card-panel,
  :global(.dark-theme) .answer,
  :global(.dark-theme) .card-actions,
  :global(.dark-theme) .sequence-item {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .card-actions {
    background-color: var(--color-background-dark-raised);
  }
  :global(.dark-theme) .sequence-item {
    background-color: var(--color-background-dark);
  }
  :global(.dark-theme) .review-screen {
    background-color: var(--color-page-background-dark);
  }
</style>
