<!-- src/lib/components/review/ReviewController.svelte (Versión Final y Robusta) -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { reviewStore } from '$lib/stores/reviewStore';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { Card, ReviewQuality, SequencingCard } from '$lib/types';
  import { get } from 'svelte/store';
  import deepEqual from 'deep-eql';

  const review = reviewStore;

  // --- Estado Local Reactivo ---
  let userInput = $state('');
  let userSequence = $state<string[]>([]);
  let draggedItemIndex = $state<number | null>(null);

  // --- Estado Derivado ---
  // Se ejecuta cada vez que el estado del store cambia.
  $effect(() => {
    const currentCard = $review.cardsToReview[$review.currentCardIndex];
    if (currentCard && currentCard.type === 'sequencing') {
      // Desordena los ítems para el usuario cada vez que aparece una nueva tarjeta de secuencia.
      userSequence = [...currentCard.content.items].sort(
        () => Math.random() - 0.5
      );
    } else {
      // Limpia el estado para otros tipos de tarjeta.
      userSequence = [];
    }
    // Limpia el input del usuario para cada nueva tarjeta.
    userInput = '';
  });

  // --- Manejadores de Eventos ---

  function handleCheckInput() {
    const currentCard = $review.cardsToReview[$review.currentCardIndex];
    if (currentCard.type !== 'input') return;
    const isCorrect =
      userInput.trim().toLowerCase() ===
      currentCard.content.expected.trim().toLowerCase();
    review.submitInteractiveAnswer(isCorrect);
  }

  function handleCheckSequence() {
    const currentCard = $review.cardsToReview[$review.currentCardIndex];
    if (currentCard.type !== 'sequencing') return;
    const isCorrect = deepEqual(userSequence, currentCard.content.items);
    review.submitInteractiveAnswer(isCorrect);
  }

  function submitReview(quality: ReviewQuality) {
    review.submitReview(quality);
  }

  // --- Lógica de Arrastrar y Soltar (Drag and Drop) ---

  function handleDragStart(index: number) {
    draggedItemIndex = index;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault(); // Necesario para permitir el drop.
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

{#if $review.isReviewing}
  {@const currentCard = $review.cardsToReview[$review.currentCardIndex]}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
  >
    {#if currentCard}
      <div class="card">
        <div class="card-content">
          <!-- Renderizado condicional basado en el tipo de tarjeta -->

          {#if currentCard.type === 'basic'}
            <p class="question">{currentCard.content.question}</p>
            {#if $review.isAnswerShown}
              <div class="answer" transition:fade>
                <p>{currentCard.content.answer}</p>
              </div>
            {/if}
          {:else if currentCard.type === 'input'}
            <p class="question">{currentCard.content.prompt}</p>
            <input
              type="text"
              class="input-field"
              placeholder="Escribe tu respuesta..."
              bind:value={userInput}
              disabled={$review.isAnswerShown}
            />
            {#if $review.isAnswerShown}
              <div
                class="feedback"
                class:correct={$review.lastAnswerCorrect}
                class:incorrect={!$review.lastAnswerCorrect}
                transition:fade
              >
                Respuesta correcta: <strong
                  >{currentCard.content.expected}</strong
                >
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
            {#if $review.isAnswerShown}
              <div
                class="feedback"
                class:correct={$review.lastAnswerCorrect}
                class:incorrect={!$review.lastAnswerCorrect}
                transition:fade
              >
                {#if $review.lastAnswerCorrect}
                  ¡Secuencia correcta!
                {:else}
                  <p>La secuencia correcta es:</p>
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

        <!-- Acciones de la Tarjeta -->
        <div class="card-actions">
          {#if !$review.isAnswerShown}
            {#if currentCard.type === 'basic'}
              <Button onclick={review.showAnswer} size="md"
                >Mostrar Respuesta</Button
              >
            {:else if currentCard.type === 'input'}
              <Button onclick={handleCheckInput} size="md">Comprobar</Button>
            {:else if currentCard.type === 'sequencing'}
              <Button onclick={handleCheckSequence} size="md">Comprobar</Button>
            {/if}
          {:else}
            <div class="review-buttons">
              <Button
                onclick={() => submitReview(0)}
                size="md"
                variant="secondary">Otra vez</Button
              >
              <Button
                onclick={() => submitReview(3)}
                size="md"
                variant="secondary">Difícil</Button
              >
              <Button
                onclick={() => submitReview(5)}
                size="md"
                variant="primary">Fácil</Button
              >
            </div>
          {/if}
        </div>
      </div>

      <!-- Controles Globales del Repaso -->
      <div class="global-controls">
        <Button
          onclick={review.jumpToSource}
          variant="ghost"
          size="sm"
          aria-label="Ir a la fuente"
        >
          <Icon name="file-text" size={16} />
        </Button>
        <Button onclick={review.finishReview} variant="ghost" size="sm"
          >Finalizar Repaso</Button
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
    background-color: var(--color-background);
    border-radius: var(--space-md);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    width: 100%;
    border: 1px solid var(--color-gray-100);
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
    border-top: 1px solid var(--color-gray-100);
    line-height: 1.6;
  }
  .answer p {
    margin: 0;
  }
  .card-actions {
    background-color: var(--color-gray-100);
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
    border: 1px solid var(--color-gray-200);
    border-radius: var(--space-sm);
    margin-top: var(--space-sm);
  }
  .feedback {
    margin-top: var(--space-md);
    padding: var(--space-sm);
    border-radius: var(--space-sm);
    font-weight: 500;
  }
  .feedback.correct {
    background-color: hsl(134, 61%, 95%);
    color: hsl(134, 61%, 25%);
    border: 1px solid hsl(134, 61%, 85%);
  }
  .feedback.incorrect {
    background-color: hsl(0, 84%, 96%);
    color: hsl(0, 84%, 36%);
    border: 1px solid hsl(0, 84%, 86%);
  }
  .sequence-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  .sequence-item {
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-gray-100);
    border: 1px solid var(--color-gray-200);
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
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .global-controls {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 var(--space-xs);
  }
</style>
