<!-- src/lib/components/review/CardEditorPanel.svelte (Versión Rediseñada) -->

<script lang="ts">
  // --- Svelte Core ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { flip } from 'svelte/animate';

  // --- Lógica de la Aplicación ---
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import type { Card, CardType } from '$lib/types';
  import { debounce } from '$lib/utils/debounce';

  // --- Componentes de UI ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';

  const cardEditor = cardEditorStore;

  // Variables para la UI
  let showAddMenu = $state(false);
  let localCards = $derived($cardEditor.cards);

  const debouncedUpdateCard = debounce((card: Card) => {
    cardEditorStore.updateCard(card);
  }, 500);

  function handleUpdate(card: Card) {
    localCards = localCards;
    debouncedUpdateCard(card);
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
      handleUpdate(card);
    }
  }

  function removeSequenceItem(card: Card, itemIndex: number) {
    if (card.type === 'sequencing') {
      card.content.items.splice(itemIndex, 1);
      handleUpdate(card);
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
        <div class="cards-list">
          {#each localCards as card (card.id)}
            <div class="card-wrapper" animate:flip={{ duration: 300 }}>
              <div
                class="card-type-indicator"
                class:basic={card.type === 'basic'}
                class:input={card.type === 'input'}
                class:sequencing={card.type === 'sequencing'}
              >
                {card.type}
              </div>
              <div class="card-inputs">
                {#if card.type === 'basic'}
                  <div class="field">
                    <label for="q-{card.id}">Pregunta</label>
                    <input
                      id="q-{card.id}"
                      type="text"
                      placeholder="Escribe la pregunta..."
                      bind:value={card.content.question}
                      oninput={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="a-{card.id}">Respuesta</label>
                    <textarea
                      id="a-{card.id}"
                      placeholder="Escribe la respuesta..."
                      bind:value={card.content.answer}
                      rows="2"
                      oninput={() => handleUpdate(card)}
                    ></textarea>
                  </div>
                {:else if card.type === 'input'}
                  <div class="field">
                    <label for="p-{card.id}"
                      >Enunciado (usa {'{{...}}'} para el hueco)</label
                    >
                    <input
                      id="p-{card.id}"
                      type="text"
                      placeholder="Ej: La capital de Francia es &#123;&#123;...&#125;&#125;"
                      bind:value={card.content.prompt}
                      oninput={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="e-{card.id}">Respuesta Esperada</label>
                    <input
                      id="e-{card.id}"
                      type="text"
                      placeholder="Ej: París"
                      bind:value={card.content.expected}
                      oninput={() => handleUpdate(card)}
                    />
                  </div>
                {:else if card.type === 'sequencing'}
                  <div class="field">
                    <label for="s-{card.id}">Instrucción</label>
                    <input
                      id="s-{card.id}"
                      type="text"
                      placeholder="Ej: Ordena los siguientes pasos..."
                      bind:value={card.content.prompt}
                      oninput={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="sequence-items">
                    {#each card.content.items as item, itemIndex}
                      <div class="sequence-item">
                        <span class="drag-handle">::</span>
                        <input
                          type="text"
                          placeholder="Ítem de la secuencia..."
                          bind:value={card.content.items[itemIndex]}
                          oninput={() => handleUpdate(card)}
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
                {/if}
              </div>
              <button
                class="remove-card-button"
                onclick={() => removeCard(card.id)}
                aria-label="Eliminar tarjeta"
              >
                <Icon name="trash-2" size={16} />
              </button>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <Icon name="pen-tool" size={32} />
          <h3>Sin Tarjetas Aún</h3>
          <p>Crea tu primera tarjeta de estudio para este concepto.</p>
        </div>
      {/if}

      {#if !$cardEditor.isLoading}
        <div class="add-card-container">
          {#if showAddMenu}
            <div class="add-menu" transition:fade={{ duration: 100 }}>
              <button onclick={() => addCard('basic')}
                ><Icon name="pen-tool" size={16} /> Básica (P/R)</button
              >
              <button onclick={() => addCard('input')}
                ><Icon name="edit-3" size={16} /> Rellenar Hueco</button
              >
              <button onclick={() => addCard('sequencing')}
                ><Icon name="list" size={16} /> Secuencia</button
              >
            </div>
          {/if}
          <Button
            variant="primary"
            size="md"
            onclick={() => (showAddMenu = !showAddMenu)}
          >
            <Icon name="plus" size={16} />
            Añadir Tarjeta
          </Button>
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

  .panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 101;
    background-color: var(--color-page-background);
    border-top: 1px solid var(--color-gray-100);
    border-radius: var(--space-md) var(--space-md) 0 0;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    overflow: hidden;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-gray-100);
    flex-shrink: 0;
    background-color: var(--color-background);
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

  .editor-content {
    display: flex;
    flex-direction: column;
    padding: var(--space-md);
    overflow-y: auto;
    gap: var(--space-lg);
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    gap: var(--space-md);
    color: var(--color-gray-500);
    text-align: center;
  }

  .empty-state h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--color-text);
  }
  .empty-state p {
    margin: 0;
    max-width: 250px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .loading-state :global(.icon-wrapper) {
    animation: spin 1s linear infinite;
  }

  .cards-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .card-wrapper {
    background-color: var(--color-background);
    border: 1px solid var(--color-gray-100);
    border-radius: var(--space-md);
    padding: var(--space-md);
    display: flex;
    gap: var(--space-md);
    position: relative;
    transition: box-shadow 0.2s;
  }

  .card-wrapper:focus-within {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  .card-type-indicator {
    position: absolute;
    top: -1px;
    left: -1px;
    padding: 3px 8px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: var(--space-md) 0 var(--space-sm) 0;
    color: white;
  }

  .card-type-indicator.basic {
    background-color: #007aff;
  }
  .card-type-indicator.input {
    background-color: #34c759;
  }
  .card-type-indicator.sequencing {
    background-color: #ff9500;
  }

  .card-inputs {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-left: 80px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .field label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-gray-500);
  }

  .card-inputs input,
  .card-inputs textarea {
    width: 100%;
    padding: var(--space-sm);
    font-family: var(--font-main);
    font-size: 0.9rem;
    background-color: var(--color-gray-100);
    border: 1px solid transparent;
    border-radius: var(--space-sm);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .card-inputs input:focus-visible,
  .card-inputs textarea:focus-visible {
    outline: none;
    border-color: var(--color-accent);
    background-color: var(--color-background);
  }

  .remove-card-button {
    background: none;
    border: none;
    color: var(--color-gray-500);
    padding: 4px;
    border-radius: 50%;
    cursor: pointer;
    align-self: flex-start;
  }

  .remove-card-button:hover {
    background-color: var(--color-gray-100);
    color: var(--color-danger);
  }

  .sequence-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .sequence-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .drag-handle {
    cursor: grab;
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
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .add-card-container {
    position: relative;
    display: flex;
    justify-content: center;
    padding-top: var(--space-md);
  }

  .add-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    background: var(--color-background);
    border-radius: var(--space-sm);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--color-gray-100);
    padding: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 200px;
    z-index: 10;
  }

  .add-menu button {
    width: 100%;
    text-align: left;
    padding: var(--space-sm);
    background: none;
    border: none;
    border-radius: var(--space-xs);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-weight: 500;
  }
  .add-menu button:hover {
    background: var(--color-gray-100);
  }

  @media (min-width: 640px) {
    .panel {
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 680px;
      border-radius: var(--space-md);
      bottom: var(--space-lg);
      max-height: 70vh;
    }
  }

  @media (prefers-color-scheme: dark) {
    .panel {
      border-color: var(--color-gray-100);
      background-color: #111;
    }
    .header {
      border-color: var(--color-gray-100);
      background-color: #1c1c1e;
    }
    .card-wrapper {
      background-color: #1c1c1e;
      border-color: var(--color-gray-100);
    }
    .card-inputs input,
    .card-inputs textarea {
      background-color: #2c2c2e;
      color: var(--color-text);
    }
    .card-inputs input:focus-visible,
    .card-inputs textarea:focus-visible {
      background-color: #1c1c1e;
    }
    .remove-card-button:hover {
      background-color: var(--color-gray-100);
    }
    .add-menu {
      background-color: #2c2c2e;
      border-color: var(--color-gray-200);
    }
    .add-menu button:hover {
      background-color: var(--color-gray-100);
    }
  }
</style>
