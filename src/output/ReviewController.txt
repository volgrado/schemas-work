<!--
  @component
  ReviewController.svelte

  Este componente es la interfaz de usuario para el "Ritual del Aprendizaje" o Modo Repaso.
  Aparece como un panel flotante cuando el `reviewStore` está en estado 'isReviewing'.

  Responsabilidades:
  - Mostrar la pregunta de la tarjeta de estudio actual.
  - Revelar la respuesta solo cuando el usuario lo solicita.
  - Proporcionar controles para mostrar la respuesta, avanzar a la siguiente tarjeta
    o finalizar la sesión de repaso.
  - Toda la lógica del flujo de repaso reside en `reviewStore.ts`; este
    componente solo refleja el estado y despacha acciones.
-->
<script lang="ts">
  // --- Svelte Core ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- Lógica de la Aplicación ---
  import { reviewStore } from '$lib/stores/reviewStore';

  // --- Componentes de UI ---
  import Button from '$lib/components/ui/Button.svelte';

  const state = reviewStore;

  /**
   * Variable reactiva que deriva la tarjeta actual del estado del store.
   * Si el estado cambia, `currentCard` se recalcula automáticamente.
   * Se asume una tarjeta por nodo en esta versión para simplificar.
   */
  $: currentCard =
    $state.nodesToReview.length > 0 &&
    $state.currentNodeIndex < $state.nodesToReview.length
      ? $state.nodesToReview[$state.currentNodeIndex].cards[0]
      : null;
</script>

{#if $state.isReviewing && currentCard}
  <div
    class="panel"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
  >
    <div class="card">
      <div class="card-content">
        <p class="question">{currentCard.q}</p>

        <!-- La respuesta solo se renderiza cuando isAnswerShown es true -->
        {#if $state.isAnswerShown}
          <div class="answer" transition:fade>
            <p>{currentCard.a}</p>
          </div>
        {/if}
      </div>

      <div class="card-actions">
        {#if !$state.isAnswerShown}
          <!-- Este botón actualiza el store para mostrar la respuesta -->
          <Button on:click={reviewStore.showAnswer} size="md"
            >Mostrar Respuesta</Button
          >
        {:else}
          <!-- Este botón le pide al store que avance a la siguiente tarjeta -->
          <Button on:click={reviewStore.nextCard} size="md">Siguiente</Button>
        {/if}
      </div>
    </div>

    <!-- El botón para salir del modo repaso siempre está visible -->
    <Button on:click={reviewStore.finishReview} variant="ghost" size="sm"
      >Finalizar Repaso</Button
    >
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
</style>
