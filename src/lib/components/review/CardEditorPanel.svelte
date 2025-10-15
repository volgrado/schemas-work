<!-- src/lib/components/review/CardEditorPanel.svelte -->

<script lang="ts">
  // --- Svelte Core ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // --- Lógica de la Aplicación ---
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import type { Card, CardType } from '$lib/types';

  // --- Componentes de UI ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';

  const cardEditor = cardEditorStore;

  // Variables para la UI
  let showAddMenu = $state(false);

  // Usamos $derived para crear una copia local reactiva.
  // Esto es más seguro que un $: en Svelte 5 para evitar bucles.
  let localCards = $derived($cardEditor.cards);

  function handleUpdate() {
    // En lugar de una sola función, podríamos tener funciones más granulares.
    // Pero por ahora, actualizamos todas las tarjetas para simplicidad.
    localCards.forEach((card) => {
      cardEditorStore.updateCard(card);
    });
  }

  function addCard(type: CardType) {
    cardEditorStore.addCard(type);
    showAddMenu = false;
  }

  function removeCard(id: string) {
    cardEditorStore.deleteCard(id);
  }

  function addSequenceItem(card: Card) {
    if (card.type === 'sequencing') {
      card.content.items.push('');
      localCards = localCards; // Trigger reactivity
    }
  }

  function removeSequenceItem(card: Card, itemIndex: number) {
    if (card.type === 'sequencing') {
      card.content.items.splice(itemIndex, 1);
      localCards = localCards; // Trigger reactivity
    }
  }

  function handleClose() {
    cardEditorStore.close();
  }
</script>

{#if $cardEditor.isOpen}
  <button
    class="overlay"
    onclick={handleClose}
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
          para memorizar conceptos clave.
        </HelpTooltip>
      </div>
      <Button onclick={handleClose} variant="primary">Hecho</Button>
    </header>

    <div class="editor-content">
      {#if $cardEditor.isLoading}
        <div class="loading-state">
          <Icon name="loader" size={24} />
          <p>Cargando tarjetas...</p>
        </div>
      {:else if localCards.length > 0}
        {#each localCards as card, i (card.id)}
          <div class="card-wrapper">
            <!-- Renderizado condicional basado en el tipo de tarjeta -->
            {#if card.type === 'basic'}
              <div class="card-input basic">
                <input
                  type="text"
                  placeholder="Pregunta..."
                  bind:value={card.content.question}
                  oninput={handleUpdate}
                />
                <textarea
                  placeholder="Respuesta..."
                  bind:value={card.content.answer}
                  rows="2"
                  oninput={handleUpdate}
                ></textarea>
              </div>
            {:else if card.type === 'input'}
              <div class="card-input input">
                <input
                  type="text"
                  placeholder="Pregunta o enunciado..."
                  bind:value={card.content.prompt}
                  oninput={handleUpdate}
                />
                <input
                  type="text"
                  placeholder="Respuesta esperada..."
                  bind:value={card.content.expected}
                  oninput={handleUpdate}
                />
              </div>
            {:else if card.type === 'sequencing'}
              <div class="card-input sequencing">
                <input
                  type="text"
                  placeholder="Instrucción (ej. Ordena los pasos)..."
                  bind:value={card.content.prompt}
                  oninput={handleUpdate}
                />
                <div class="sequence-items">
                  {#each card.content.items as item, itemIndex}
                    <div class="sequence-item">
                      <span>{itemIndex + 1}</span>
                      <input
                        type="text"
                        placeholder="Ítem de la secuencia..."
                        bind:value={card.content.items[itemIndex]}
                        oninput={handleUpdate}
                      />
                      <button
                        class="remove-item-button"
                        onclick={() => removeSequenceItem(card, itemIndex)}
                        aria-label="Eliminar ítem"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  {/each}
                  <button
                    class="add-item-button"
                    onclick={() => addSequenceItem(card)}
                  >
                    <Icon name="plus" size={14} /> Añadir Ítem
                  </button>
                </div>
              </div>
            {/if}

            <button
              class="remove-card-button"
              onclick={() => removeCard(card.id)}
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

      {#if !$cardEditor.isLoading}
        <div class="add-card-container">
          {#if showAddMenu}
            <div class="add-menu" transition:fade={{ duration: 100 }}>
              <button onclick={() => addCard('basic')}>Básica (P/R)</button>
              <button onclick={() => addCard('input')}>Rellenar</button>
              <button onclick={() => addCard('sequencing')}>Secuencia</button>
            </div>
          {/if}
          <button
            class="add-card-button"
            onclick={() => (showAddMenu = !showAddMenu)}
          >
            <Icon name="plus" size={16} />
            Añadir Tarjeta
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
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
    gap: var(--space-lg);
    padding: var(--space-md);
    overflow-y: auto;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    gap: var(--space-md);
    color: var(--color-gray-500);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .loading-state :global(.icon-wrapper) {
    animation: spin 1s linear infinite;
  }

  .card-wrapper {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .card-input {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
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

  .card-input input:focus-visible,
  .card-input textarea:focus-visible {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(var(--color-accent-hsl), 0.2);
  }

  .remove-card-button {
    background: none;
    border: none;
    color: var(--color-gray-500);
    padding: 4px;
    border-radius: 50%;
    cursor: pointer;
    margin-top: 8px; /* Alinea con el primer input */
  }

  .remove-card-button:hover {
    background-color: var(--color-gray-100);
    color: var(--color-danger);
  }

  .sequence-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-xs);
  }
  .sequence-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .sequence-item span {
    font-size: 0.8rem;
    color: var(--color-gray-500);
  }
  .remove-item-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-gray-500);
  }
  .add-item-button {
    font-size: 0.85rem;
    color: var(--color-accent);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: var(--space-xs);
  }

  .add-card-container {
    position: relative;
  }

  .add-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-background);
    border-radius: var(--space-sm);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-gray-100);
    padding: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 180px;
  }

  .add-menu button {
    width: 100%;
    text-align: left;
    padding: var(--space-sm);
    background: none;
    border: none;
    border-radius: var(--space-xs);
    cursor: pointer;
  }
  .add-menu button:hover {
    background: var(--color-gray-100);
  }

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
  }

  .add-card-button:hover {
    background-color: var(--color-gray-100);
  }

  .empty-state {
    text-align: center;
    color: var(--color-gray-500);
    font-style: italic;
    padding: var(--space-md) 0;
  }

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
