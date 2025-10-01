<!-- src/lib/components/review/CardEditorPanel.svelte -->

<script lang="ts">
  // --- Svelte Core ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- Lógica de la Aplicación ---
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import type { DomainCard } from '$lib/types';

  // --- Componentes de UI ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';

  const state = cardEditorStore;

  let localCards: DomainCard[] = [];
  $: localCards = $state.cards;

  function handleUpdate() {
    cardEditorStore.updateCardsInStore(localCards);
    cardEditorStore.saveCardsToEditor();
  }

  function addCard() {
    // En lugar de modificar el array local, llamamos a la acción del store
    cardEditorStore.prefillAndAddCard();
  }

  function removeCard(index: number) {
    localCards = localCards.filter((_, i) => i !== index);
    handleUpdate();
  }

  function handleClose() {
    cardEditorStore.close();
  }
</script>

{#if $state.isOpen}
  <button
    class="overlay"
    on:click={handleClose}
    transition:fade={{ duration: 150 }}
    aria-label="Cerrar editor de tarjetas"
  ></button>

  <div
    class="panel"
    transition:fly={{ y: 100, duration: 250, easing: quintOut }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="panel-title"
  >
    <header class="header">
      <div class="header-title">
        <h3 id="panel-title">Tarjetas de Estudio</h3>
        <HelpTooltip>
          Crea preguntas y respuestas para este nodo. Úsalas en el "Modo Repaso"
          para memorizar conceptos clave mediante el recuerdo activo.
        </HelpTooltip>
      </div>
      <Button on:click={handleClose} variant="primary">Hecho</Button>
    </header>

    <div class="editor-content">
      {#if localCards.length > 0}
        {#each localCards as card, i}
          <div class="card-input">
            <input
              type="text"
              placeholder="Pregunta..."
              bind:value={card.q}
              on:blur={handleUpdate}
            />
            <!--
              CORRECCIÓN DE SINTAXIS: Al igual que <button>, <textarea>
              debe tener una etiqueta de cierre explícita </textarea>.
            -->
            <textarea
              placeholder="Respuesta..."
              bind:value={card.a}
              rows="2"
              on:blur={handleUpdate}
            ></textarea>
            <button
              class="remove-card-button"
              on:click={() => removeCard(i)}
              aria-label="Eliminar tarjeta"
            >
              <Icon name="trash-2" size={16} />
            </button>
          </div>
        {/each}
      {:else}
        <p class="empty-state">
          No hay tarjetas para este nodo. ¡Añade la primera!
        </p>
      {/if}

      <button class="add-card-button" on:click={addCard}>
        <Icon name="plus" size={16} />
        Añadir Tarjeta
      </button>
    </div>
  </div>
{/if}

<style>
  /* === Overlay === */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
    border: none;
    cursor: default;
  }

  /* === Panel Principal === */
  .panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 101;

    background-color: var(--color-background);
    border-top: 1px solid var(--color-gray-100);
    border-radius: var(--space-md) var(--space-md) 0 0;
    box-shadow:
      0 -4px 12px rgba(0, 0, 0, 0.04),
      0 -8px 32px rgba(0, 0, 0, 0.08);

    display: flex;
    flex-direction: column;
    max-height: 75vh;
    overflow: hidden;
  }

  /* === Encabezado === */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-gray-100);
    flex-shrink: 0;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .header-title h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  /* === Contenido del Editor === */
  .editor-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
    overflow-y: auto;
  }

  /* === Estado Vacío === */
  .empty-state {
    text-align: center;
    color: var(--color-gray-500);
    font-style: italic;
    padding: var(--space-md) 0;
  }

  /* === Tarjetas === */
  .card-input {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-sm);
    align-items: center;
  }

  .card-input input,
  .card-input textarea {
    width: 100%;
    padding: var(--space-sm);
    font-family: var(--font-main);
    font-size: 0.9rem;
    background-color: var(--color-background);
    border: 1px solid var(--color-gray-100);
    border-radius: var(--space-sm);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  /* Foco visible accesible */
  .card-input input:focus-visible,
  .card-input textarea:focus-visible {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
  }

  /* === Botón Eliminar === */
  .remove-card-button {
    grid-column: 2 / 3;
    grid-row: 1 / 3;

    background: none;
    border: none;
    color: var(--color-gray-500);
    padding: 4px;
    border-radius: 50%;
    cursor: pointer;

    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-card-button:hover {
    background-color: var(--color-gray-100);
    color: #e53e3e;
  }

  /* === Botón Añadir === */
  .add-card-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);

    width: 100%;
    padding: var(--space-sm);
    background: none;
    border: 1px dashed var(--color-gray-100);
    border-radius: var(--space-sm);
    cursor: pointer;

    color: var(--color-gray-500);
    font-weight: 500;
    transition:
      background-color 0.2s,
      border-style 0.2s;
  }

  .add-card-button:hover {
    background-color: var(--color-gray-100);
    border-style: solid;
  }

  /* === Responsivo === */
  @media (min-width: 640px) {
    .panel {
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 600px;
      border-radius: var(--space-md);
    }
  }
</style>
