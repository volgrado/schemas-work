<!--
  @component
  ReviewController

  This component is the core UI for the spaced repetition review feature. It presents flashcards
  to the user, manages their interactions, and orchestrates the review flow based on the card type.

  It handles three distinct types of flashcards:
  - `basic`: A standard question-and-answer card where the user self-assesses their recall.
  - `input`: A card that prompts the user for a text-based answer, which is automatically evaluated for correctness.
  - `sequencing`: An interactive card where the user must arrange items into the correct order via drag-and-drop.

  The component is driven by the `reviewStore` for its state and uses the `reviewService` to evaluate answers.
  It uses local state (managed with Svelte 5 Runes) for user inputs and interaction states.
-->
<script lang="ts">
  // --- Svelte and UI Imports ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { get } from 'svelte/store';

  // --- Stores and Services ---
  import { t } from '$lib/utils/i18n';
  import { reviewStore } from '$lib/stores/reviewStore';
  import { evaluateAnswer } from '$lib/services/features/reviewService';

  // --- Components ---
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // --- Utilities and Types ---
  import type { ReviewQuality } from '$lib/types';
  import deepEqual from 'deep-eql'; // Used for comparing sequence arrays

  const review = reviewStore;

  // --- Local Reactive State ---
  let userInput = $state('');
  let userSequence = $state<string[]>([]);
  let draggedItemIndex = $state<number | null>(null);
  let isSubmitting = $state(false); // Prevents multiple submissions for automatic evaluation

  /**
   * This effect hook resets the local state whenever a new card is presented.
   * It shuffles the items for sequencing cards to ensure a fresh challenge each time.
   */
  $effect(() => {
    const currentCard = $review.cardsToReview[$review.currentCardIndex];
    if (currentCard && currentCard.type === 'sequencing') {
      // Create a shuffled version of the sequence for the user to solve.
      userSequence = [...currentCard.content.items].sort(
        () => Math.random() - 0.5
      );
    } else {
      userSequence = [];
    }
    userInput = '';
    isSubmitting = false; // Reset submission lock on new card
  });

  // --- Event Handlers ---

  /**
   * Handles the answer submission for 'input' type cards.
   * It calls an AI service to evaluate the answer, shows immediate visual feedback,
   * and then automatically submits the review after a short delay.
   */
  async function handleCheckInput() {
    const currentCard = $review.cardsToReview[$review.currentCardIndex];
    if (currentCard.type !== 'input' || isSubmitting) return;

    isSubmitting = true;

    const quality = await evaluateAnswer(
      userInput,
      currentCard.content.expected
    );

    // 1. Show immediate feedback (Correct/Incorrect) to the user.
    review.submitInteractiveAnswer(quality >= 3);

    // 2. Automatically submit the actual review quality after a delay to allow the user to read the feedback.
    setTimeout(() => {
      review.submitReview(quality);
    }, 2000); // 2-second delay for feedback visibility
  }

  /**
   * Checks if the user-ordered sequence is correct for 'sequencing' cards.
   */
  function handleCheckSequence() {
    const currentCard = $review.cardsToReview[$review.currentCardIndex];
    if (currentCard.type !== 'sequencing') return;
    const isCorrect = deepEqual(userSequence, currentCard.content.items);
    review.submitInteractiveAnswer(isCorrect);
  }

  /**
   * Submits the user's self-assessed review quality for a card.
   * @param {ReviewQuality} quality - The user's rating of how well they knew the answer.
   */
  function submitReview(quality: ReviewQuality) {
    review.submitReview(quality);
  }

  // --- Drag and Drop Logic for Sequencing Cards ---

  function handleDragStart(index: number) {
    draggedItemIndex = index;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault(); // Necessary to allow a drop event.
  }

  function handleDrop(targetIndex: number) {
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      draggedItemIndex = null;
      return;
    }

    // Reorder the sequence array based on the drop.
    const newSequence = [...userSequence];
    const [draggedItem] = newSequence.splice(draggedItemIndex, 1);
    newSequence.splice(targetIndex, 0, draggedItem);

    userSequence = newSequence;
    draggedItemIndex = null;
  }
</script>

<!-- The entire review panel is only rendered when a review session is active. -->
{#if $review.isReviewing}
  {@const currentCard = $review.cardsToReview[$review.currentCardIndex]}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
  >
    {#if currentCard}
      <div class="card">
        <div class="card-content">
          <!-- Render content based on the current card's type -->

          <!-- Basic Q&A Card -->
          {#if currentCard.type === 'basic'}
            <p class="question">{currentCard.content.question}</p>
            {#if $review.isAnswerShown}
              <div class="answer" transition:fade>
                <p>{currentCard.content.answer}</p>
              </div>
            {/if}

            <!-- Input Card -->
          {:else if currentCard.type === 'input'}
            <p class="question">{currentCard.content.prompt}</p>
            <input
              type="text"
              class="input-field"
              placeholder={$t('review.inputPlaceholder')}
              bind:value={userInput}
              disabled={$review.isAnswerShown || isSubmitting}
            />
            {#if $review.isAnswerShown}
              <div
                class="feedback"
                class:correct={$review.lastAnswerCorrect}
                class:incorrect={!$review.lastAnswerCorrect}
                transition:fade
              >
                {$t('review.correctAnswer')}
                <strong>{currentCard.content.expected}</strong>
              </div>
            {/if}

            <!-- Sequencing Card -->
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
            {#if $review.isAnswerShown}
              <div
                class="feedback"
                class:correct={$review.lastAnswerCorrect}
                class:incorrect={!$review.lastAnswerCorrect}
                transition:fade
              >
                {#if $review.lastAnswerCorrect}
                  {$t('review.correctSequence')}
                {:else}
                  <p>{$t('review.correctSequenceIs')}</p>
                  <ol>
                    {#each currentCard.content.items as item}
                      <li>{item}</li>
                    {/each}
                  </ol>
                {/if}
              </div>
            {/if}
          {/if}
        </div>

        <!-- Card Actions: Buttons change based on interaction state -->
        <div class="card-actions">
          {#if !$review.isAnswerShown}
            <!-- Initial state: User has not yet answered -->
            {#if currentCard.type === 'basic'}
              <Button onclick={review.showAnswer} size="md"
                >{$t('review.showAnswer')}</Button
              >
            {:else if currentCard.type === 'input'}
              <Button
                onclick={handleCheckInput}
                size="md"
                disabled={isSubmitting}
              >
                {#if isSubmitting}{$t('review.evaluating')}{:else}{$t(
                    'review.check'
                  )}{/if}
              </Button>
            {:else if currentCard.type === 'sequencing'}
              <Button onclick={handleCheckSequence} size="md"
                >{$t('review.check')}</Button
              >
            {/if}
          {:else}
            <!-- Answer shown state: User provides self-assessment -->
            <!-- For 'input' cards, review is automatic, so no buttons are needed here. -->
            {#if currentCard.type !== 'input'}
              <div class="review-buttons">
                <Button
                  onclick={() => submitReview(0)}
                  size="md"
                  variant="secondary">{$t('review.again')}</Button
                >
                <Button
                  onclick={() => submitReview(3)}
                  size="md"
                  variant="secondary">{$t('review.hard')}</Button
                >
                <Button
                  onclick={() => submitReview(5)}
                  size="md"
                  variant="primary">{$t('review.easy')}</Button
                >
              </div>
            {/if}
          {/if}
        </div>
      </div>

      <!-- Global Controls: Available throughout the review -->
      <div class="global-controls">
        <Button
          onclick={review.jumpToSource}
          variant="ghost"
          size="sm"
          aria-label={$t('review.goToSource')}
        >
          <Icon name="file-text" size={16} />
        </Button>
        <Button onclick={review.finishReview} variant="ghost" size="sm"
          >{$t('review.finishReview')}</Button
        >
      </div>
    {/if}
  </div>
{/if}

<style>
  .panel {
    position: fixed;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    width: 90%;
    max-width: 600px;
  }
  .card {
    background-color: var(--color-background-raised);
    border-radius: var(--space-md);
    box-shadow: var(--shadow-xl);
    width: 100%;
    border: 1px solid var(--color-border);
    overflow: hidden;
  }
  .card-content {
    padding: var(--space-lg);
  }
  .question {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0 0 var(--space-md) 0;
    line-height: 1.4;
  }
  .answer {
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    line-height: 1.6;
  }
  .answer p {
    margin: 0;
  }
  .card-actions {
    background-color: var(--color-background);
    border-top: 1px solid var(--color-border);
    padding: var(--space-sm) var(--space-lg);
    display: flex;
    justify-content: flex-end;
  }
  .review-buttons {
    display: flex;
    gap: var(--space-sm);
  }
  .input-field {
    width: 100%;
    padding: var(--space-sm);
    font-family: var(--font-main);
    font-size: 1rem;
    border: 1px solid var(--color-border-input);
    border-radius: var(--space-sm);
    margin-top: var(--space-sm);
    background-color: var(--color-background);
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

  .global-controls {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 var(--space-xs);
  }

  @media (prefers-color-scheme: dark) {
    .card {
      border-color: var(--color-border-dark);
    }
    .answer {
      border-color: var(--color-border-dark);
    }
    .card-actions {
      background-color: var(--color-background-dark-raised);
      border-color: var(--color-border-dark);
    }
    .input-field {
      background-color: var(--color-background-dark);
      border-color: var(--color-border-input-dark);
    }
    .sequence-item {
      background-color: var(--color-background-dark);
      border-color: var(--color-border-dark);
    }
  }
</style>
