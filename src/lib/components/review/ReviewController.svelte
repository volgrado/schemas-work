<!--
  @component
  ReviewController

  Core UI del sistema de repetición espaciada.
  Gestiona tarjetas tipo 'basic', 'input' y 'sequencing'.
-->
<script lang="ts">
  // --- Importaciones principales ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  import { t } from '$lib/utils/i18n';
  // FIX: Importar el state rune y las acciones directamente desde el store.
  import {
    reviewState,
    submitInteractiveAnswer,
    submitReview,
    finishReview,
    jumpToSource,
    showAnswer,
  } from '$lib/stores/reviewStore.svelte';
  import { evaluateAnswer } from '$lib/services/features/reviewService';

  import Button from '$lib/components/core/Button.svelte';
  import Icon from '$lib/components/core/Icon.svelte';
  // FIX: Importar el namespace SRS y crear alias locales para los tipos.
  import type { SRS } from '$lib/types';
  type ReviewQuality = SRS.ReviewQuality;
  type Card = SRS.Card;
  import deepEqual from 'deep-eql';

  // --- Estado local reactivo ---
  let userInput = $state('');
  let userSequence = $state<string[]>([]);
  let draggedItemIndex = $state<number | null>(null);
  let isSubmitting = $state(false);

  // --- Variables derivadas reactivas ---
  // FIX: Acceder al estado del rune directamente (sin $).
  const currentCard = $derived(
    reviewState.cardsToReview[reviewState.currentCardIndex]
  );

  const sessionProgress = $derived({
    // FIX: Añadir tipo explícito al parámetro 'c'.
    new: reviewState.cardsToReview.filter(
      (c: Card) => !c.srs || c.srs.repetitions === 0
    ).length,
    learning: [
      ...reviewState.cardsToReview,
      ...reviewState.failedQueue,
      // FIX: Añadir tipo explícito al parámetro 'c'.
    ].filter((c: Card) => c.srs?.learningStep > 0).length,
    due: reviewState.cardsToReview.filter(
      (c: Card) => c.srs?.repetitions > 0 && c.srs.learningStep === 0
    ).length,
  });

  // --- Efecto: reinicia el estado al mostrar una nueva tarjeta ---
  $effect(() => {
    if (currentCard && currentCard.type === 'sequencing') {
      userSequence = [...currentCard.content.items].sort(
        () => Math.random() - 0.5
      );
    } else {
      userSequence = [];
    }
    userInput = '';
    isSubmitting = false;
  });

  // --- Manejadores de eventos ---
  async function handleCheckInput() {
    if (!currentCard || currentCard.type !== 'input' || isSubmitting) return;
    isSubmitting = true;

    const quality = await evaluateAnswer(
      userInput,
      currentCard.content.expected
    );
    // FIX: Llamar a la función importada directamente.
    submitInteractiveAnswer(quality >= 3);

    setTimeout(() => submitReview(quality), 2000);
  }

  function handleCheckSequence() {
    if (!currentCard || currentCard.type !== 'sequencing') return;
    const isCorrect = deepEqual(userSequence, currentCard.content.items);
    submitInteractiveAnswer(isCorrect);
  }

  // Lógica de arrastrar y soltar
  function handleDragStart(index: number) {
    draggedItemIndex = index;
  }
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
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
    <div class="completion-screen">
      <h2>{$t('review.congrats_title')}</h2>
      <p>
        {$t('review.session_finished_desc', {
          count: reviewState.sessionCardCount,
        })}
      </p>
      <Button onclick={finishReview} size="lg"
        >{$t('review.finish_button')}</Button
      >
    </div>
  {:else if currentCard}
    <div class="global-controls">
      <div class="session-progress">
        <span class="new" title={$t('review.progress.new_tooltip')}
          >{sessionProgress.new}</span
        >
        <span class="learning" title={$t('review.progress.learning_tooltip')}
          >{sessionProgress.learning}</span
        >
        <span class="due" title={$t('review.progress.due_tooltip')}
          >{sessionProgress.due}</span
        >
      </div>
      <Button
        onclick={jumpToSource}
        variant="ghost"
        size="sm"
        aria-label={$t('review.goToSource')}
      >
        <Icon name="file-text" size={16} />
        <span>{$t('review.goToSource')}</span>
      </Button>
      <Button onclick={finishReview} variant="ghost" size="sm">
        {$t('review.finishReview')}
      </Button>
    </div>

    <div class="card-panel" in:fly={{ y: 20, duration: 300, easing: quintOut }}>
      <div class="card-content">
        {#if currentCard.type === 'basic'}
          <p class="question">{currentCard.content.question}</p>
          {#if reviewState.isAnswerShown}
            <div class="answer" transition:fade>
              <p>{currentCard.content.answer}</p>
            </div>
          {/if}
        {:else if currentCard.type === 'input'}
          <p class="question">{currentCard.content.prompt}</p>
          <input
            type="text"
            class="input-field"
            placeholder={$t('review.inputPlaceholder')}
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
              {$t('review.correctAnswer')}
              <strong>{currentCard.content.expected}</strong>
            </div>
          {/if}
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

      <div class="card-actions">
        {#if !reviewState.isAnswerShown}
          {#if currentCard.type === 'basic'}
            <Button onclick={showAnswer} size="lg">
              {$t('review.showAnswer')}
            </Button>
          {:else if currentCard.type === 'input'}
            <Button
              onclick={handleCheckInput}
              size="lg"
              disabled={isSubmitting}
            >
              {#if isSubmitting}{$t('review.evaluating')}{:else}{$t(
                  'review.check'
                )}{/if}
            </Button>
          {:else if currentCard.type === 'sequencing'}
            <Button onclick={handleCheckSequence} size="lg">
              {$t('review.check')}
            </Button>
          {/if}
        {:else if currentCard.type !== 'input'}
          <div class="review-buttons">
            <Button
              onclick={() => submitReview(0)}
              size="md"
              variant="secondary"
            >
              {$t('review.again')}
            </Button>
            <Button
              onclick={() => submitReview(3)}
              size="md"
              variant="secondary"
            >
              {$t('review.hard')}
            </Button>
            <Button onclick={() => submitReview(4)} size="md" variant="primary">
              {$t('review.good')}
            </Button>
            <Button onclick={() => submitReview(5)} size="md" variant="primary">
              {$t('review.easy')}
            </Button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* All styles are unchanged and correct */
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
