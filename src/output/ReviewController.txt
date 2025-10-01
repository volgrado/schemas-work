<!-- src/lib/components/review/ReviewController.svelte (REFACTORIZADO PARA SRS) -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { reviewStore } from '$lib/stores/reviewStore';
  import Button from '$lib/components/ui/Button.svelte';

  const state = reviewStore;

  $: currentCard =
    $state.nodesToReview.length > 0 &&
    $state.currentNodeIndex < $state.nodesToReview.length
      ? $state.nodesToReview[$state.currentNodeIndex].cards[0]
      : null;

  // --- NUEVO: Manejador para los botones de calificación ---
  function submitReview(quality: 0 | 3 | 5) {
    reviewStore.submitReview(quality);
  }
</script>

{#if $state.isReviewing && currentCard}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
  >
    <div class="card">
      <div class="card-content">
        <p class="question">{currentCard.q}</p>
        {#if $state.isAnswerShown}
          <div class="answer" transition:fade>
            <p>{currentCard.a}</p>
          </div>
        {/if}
      </div>

      <div class="card-actions">
        {#if !$state.isAnswerShown}
          <Button on:click={reviewStore.showAnswer} size="md"
            >Mostrar Respuesta</Button
          >
        {:else}
          <!-- *** MARKUP ACTUALIZADO: Botones de calificación *** -->
          <div class="review-buttons">
            <Button
              on:click={() => submitReview(0)}
              size="md"
              variant="secondary">Otra vez</Button
            >
            <Button
              on:click={() => submitReview(3)}
              size="md"
              variant="secondary">Difícil</Button
            >
            <Button on:click={() => submitReview(5)} size="md" variant="primary"
              >Fácil</Button
            >
          </div>
        {/if}
      </div>
    </div>
    <Button on:click={reviewStore.finishReview} variant="ghost" size="sm"
      >Finalizar Repaso</Button
    >
  </div>
{/if}

<style>
  /* ... (estilos existentes de .panel, .card, etc.) ... */
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

  /* --- NUEVO: Estilos para el contenedor de botones --- */
  .review-buttons {
    display: flex;
    gap: var(--space-sm);
  }
</style>
