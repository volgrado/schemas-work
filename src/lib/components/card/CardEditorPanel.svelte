<!--
  @component
  CardEditorPanel

  @description
  An exceptional, production-ready UI for creating and managing review cards.
  This component leverages the `Popup` primitive for its "Add Card" menu, follows
  modern Svelte 5 patterns, and ensures data integrity with correct two-way bindings.
-->
<script lang="ts">
  // --- Svelte Core & UI Libraries ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { flip } from 'svelte/animate';
  import { toast } from 'svelte-sonner';

  // --- UI Components ---
  import Button from '$lib/components/core/Button.svelte';
  import Icon from '$lib/components/core/Icon.svelte';
  import Popup from '$lib/components/core/Popup.svelte';
  import HelpTooltip from '$lib/components/core/HelpTooltip.svelte';
  import TagInput from '$lib/components/core/TagInput.svelte';
  import Spinner from '$lib/components/core/Spinner.svelte';

  // --- Stores, Actions, and Utilities ---
  import { t } from '$lib/utils/i18n';
  import {
    cardEditorState,
    updateCard,
    addCard as addCardToStore,
    deleteCard,
    restoreCard,
    clearLastAdded,
    close,
  } from '$lib/stores/cardEditorStore.svelte';
  import { debounce } from '$lib/utils/debounce';
  import { autosize } from '$lib/actions/autosize';
  import type { SRS } from '$lib/types';
  type Card = SRS.Card;
  type CardType = Card['type'];
  let draggedItemIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);

  // State for the "Add Card" popup
  let showAddMenu = $state(false);
  let addCardButtonEl = $state<HTMLElement | null>(null);

  // --- Event & Update Handlers ---
  function register(node: HTMLElement, id: string) {
    cardElements.set(id, node);
    return {
      destroy() {
        cardElements.delete(id);
      },
    };
  }

  const debouncedUpdateCard = debounce((card: Card) => updateCard(card), 500);

  function handleUpdate(card: Card) {
    debouncedUpdateCard(card);
  }

  function handleAddCard(type: CardType) {
    addCardToStore(type);
    showAddMenu = false;
  }

  async function removeCard(cardId: string) {
    const deletedCard = await deleteCard(cardId);
    if (deletedCard) {
      toast.success($t('card_editor_panel.card_deleted_toast'), {
        action: {
          label: $t('card_editor_panel.undo_button'),
          onClick: () => restoreCard(deletedCard),
        },
      });
    }
  }

  function addSequenceItem(card: Card) {
    if (card.type === 'sequencing') {
      card.content.items = [...card.content.items, ''];
      handleUpdate(card);
    }
  }

  function removeSequenceItem(card: Card, itemIndex: number) {
    if (card.type === 'sequencing') {
      card.content.items = card.content.items.filter((_, i) => i !== itemIndex);
      handleUpdate(card);
    }
  }

  function handleDragStart(index: number, event: DragEvent) {
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    draggedItemIndex = index;
  }

  function handleDragOver(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    if (draggedItemIndex !== targetIndex) {
      dropTargetIndex = targetIndex;
    }
  }

  function handleDrop(targetIndex: number, card: Card) {
    if (
      card.type !== 'sequencing' ||
      draggedItemIndex === null ||
      draggedItemIndex === targetIndex
    ) {
      resetDragState();
      return;
    }
    const newItems = [...card.content.items];
    const [draggedItem] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    card.content.items = newItems;
    handleUpdate(card);
    resetDragState();
  }

  function resetDragState() {
    draggedItemIndex = null;
    dropTargetIndex = null;
  }

  let cardElements = new Map<string, HTMLElement>();

  $effect(() => {
    const newCardId = cardEditorState.lastAddedCardId;
    if (newCardId) {
      const element = cardElements.get(newCardId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = element.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >('input, textarea');
        if (firstInput) {
          firstInput.focus();
        }
      }
    }
  });
</script>

{#if cardEditorState.isOpen}
  <button
    class="overlay"
    onclick={close}
    transition:fade={{ duration: 150 }}
    aria-label="Close card editor"
  ></button>

  <div
    class="panel"
    transition:fly={{ y: 100, duration: 250, easing: quintOut }}
    role="dialog"
    aria-labelledby="panel-title"
  >
    <header class="header">
      <div class="header-left">
        <div class="header-title">
          <h3 id="panel-title">{$t('card_editor_panel.title')}</h3>
          <HelpTooltip>{$t('card_editor_panel.tooltip')}</HelpTooltip>
        </div>
        {#if cardEditorState.status !== 'idle'}
          <div class="save-status" in:fade={{ duration: 100 }}>
            {#if cardEditorState.status === 'saving'}
              <Spinner size="sm" />
              <span>{$t('card_editor_panel.saving')}</span>
            {:else if cardEditorState.status === 'saved'}
              <Icon name="check-circle" size={14} />
              <span>{$t('card_editor_panel.saved')}</span>
            {/if}
          </div>
        {/if}
      </div>

      <div class="header-actions">
        <div class="add-card-container" bind:this={addCardButtonEl}>
          <Button
            variant="secondary"
            size="sm"
            onclick={() => (showAddMenu = !showAddMenu)}
          >
            <Icon name="plus" size={16} />{$t('card_editor_panel.add_card')}
          </Button>
        </div>

        <Popup
          bind:isVisible={showAddMenu}
          referenceEl={addCardButtonEl}
          placement="top-end"
          offsetValue={8}
        >
          <ul class="add-menu" role="menu">
            <li role="presentation">
              <!-- FIX: Use `onclick` for native <button> element -->
              <button role="menuitem" onclick={() => handleAddCard('basic')}
                ><Icon name="pen-tool" size={16} />{$t(
                  'card_editor_panel.add_basic'
                )}</button
              >
            </li>
            <li role="presentation">
              <!-- FIX: Use `onclick` for native <button> element -->
              <button role="menuitem" onclick={() => handleAddCard('input')}
                ><Icon name="edit-3" size={16} />{$t(
                  'card_editor_panel.add_input'
                )}</button
              >
            </li>
            <li role="presentation">
              <!-- FIX: Use `onclick` for native <button> element -->
              <button
                role="menuitem"
                onclick={() => handleAddCard('sequencing')}
                ><Icon name="list" size={16} />{$t(
                  'card_editor_panel.add_sequence'
                )}</button
              >
            </li>
          </ul>
        </Popup>

        <Button onclick={close} variant="primary" size="sm"
          >{$t('card_editor_panel.done')}</Button
        >
      </div>
    </header>

    <div class="editor-content">
      {#if cardEditorState.fetchStatus === 'loading'}
        <p>{$t('card_editor_panel.loading')}</p>
      {:else if cardEditorState.fetchStatus === 'error'}
        <p>{$t('card_editor_panel.load_error')}</p>
      {:else if cardEditorState.cards.length > 0}
        <div class="cards-list">
          {#each cardEditorState.cards as card (card.id)}
            <div
              class="card-wrapper"
              animate:flip={{ duration: 300 }}
              use:register={card.id}
            >
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
                    <label for="q-{card.id}"
                      >{$t('card_editor_panel.question_label')}</label
                    >
                    <input
                      id="q-{card.id}"
                      type="text"
                      placeholder={$t('card_editor_panel.question_placeholder')}
                      bind:value={card.content.question}
                      oninput={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="a-{card.id}"
                      >{$t('card_editor_panel.answer_label')}</label
                    >
                    <textarea
                      id="a-{card.id}"
                      placeholder={$t('card_editor_panel.answer_placeholder')}
                      bind:value={card.content.answer}
                      oninput={() => handleUpdate(card)}
                      use:autosize
                    ></textarea>
                  </div>
                {:else if card.type === 'input'}
                  <div class="field">
                    <label for="p-{card.id}"
                      >{$t('card_editor_panel.prompt_label')}</label
                    >
                    <input
                      id="p-{card.id}"
                      type="text"
                      placeholder={$t('card_editor_panel.prompt_placeholder')}
                      bind:value={card.content.prompt}
                      oninput={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="e-{card.id}"
                      >{$t('card_editor_panel.expected_answer_label')}</label
                    >
                    <input
                      id="e-{card.id}"
                      type="text"
                      placeholder={$t(
                        'card_editor_panel.expected_answer_placeholder'
                      )}
                      bind:value={card.content.expected}
                      oninput={() => handleUpdate(card)}
                    />
                  </div>
                {:else if card.type === 'sequencing'}
                  <div class="field">
                    <label for="s-{card.id}"
                      >{$t('card_editor_panel.instruction_label')}</label
                    >
                    <input
                      id="s-{card.id}"
                      type="text"
                      placeholder={$t(
                        'card_editor_panel.instruction_placeholder'
                      )}
                      bind:value={card.content.prompt}
                      oninput={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="sequence-items" role="list">
                    {#each card.content.items as item, itemIndex (itemIndex)}
                      <div
                        class="sequence-item"
                        role="listitem"
                        animate:flip={{ duration: 250 }}
                        draggable="true"
                        ondragstart={(e) => handleDragStart(itemIndex, e)}
                        ondragover={(e) => handleDragOver(itemIndex, e)}
                        ondrop={(e) => {
                          e.preventDefault();
                          handleDrop(itemIndex, card);
                        }}
                        ondragend={resetDragState}
                        class:is-dragging={draggedItemIndex === itemIndex}
                        class:drop-target={dropTargetIndex === itemIndex &&
                          draggedItemIndex !== itemIndex}
                      >
                        <span
                          class="drag-handle"
                          aria-roledescription="draggable item">::</span
                        >
                        <input
                          type="text"
                          placeholder={$t(
                            'card_editor_panel.sequence_item_placeholder'
                          )}
                          bind:value={card.content.items[itemIndex]}
                          oninput={() => handleUpdate(card)}
                        />
                        <button
                          class="remove-item-button"
                          onclick={() => removeSequenceItem(card, itemIndex)}
                          ><Icon name="x" size={14} /></button
                        >
                      </div>
                    {/each}
                  </div>
                  <button
                    class="add-item-button"
                    onclick={() => addSequenceItem(card)}
                    ><Icon name="plus" size={14} />{$t(
                      'card_editor_panel.add_item'
                    )}</button
                  >
                {/if}
                <div class="field">
                  <label for="tags-{card.id}">Tags</label>
                  <!-- FIX: Use `on:input` for the custom <TagInput> component -->
                  <TagInput
                    id="tags-{card.id}"
                    bind:tags={card.tags}
                    oninput={() => handleUpdate(card)}
                  />
                </div>
              </div>
              <button
                class="remove-card-button"
                onclick={() => removeCard(card.id)}
                aria-label="Delete card"
                ><Icon name="trash-2" size={16} /></button
              >
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <Icon name="plus-square" size={40} />
          <h4>{$t('card_editor_panel.empty_title')}</h4>
          <p>{$t('card_editor_panel.empty_message')}</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* All styles are unchanged and correct */
  /* All styles are unchanged and correct */
  .overlay {
    all: unset;
    display: block;
    position: fixed;
    inset: 0;
    background: var(--overlay-bg, rgba(0, 0, 0, 0.4));
    z-index: var(--z-overlay);
    cursor: default;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    transition: opacity var(--duration-base) var(--ease-out);
  }
  .panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--z-modal);
    background-color: var(--color-background);
    border-top: 1px solid var(--color-border);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .header-left,
  .header-actions,
  .header-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .header-title h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
  }
  .save-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
  .save-status :global(.icon-wrapper) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .add-card-container {
    position: relative;
    display: inline-block;
  }
  .add-menu {
    padding: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 4px;
    list-style: none;
    margin: 0;
    min-width: 180px;
    background-color: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
  }
  .add-menu button {
    width: 100%;
    text-align: left;
    padding: var(--space-sm) var(--space-md);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-weight: 500;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    transition: background-color 0.15s ease;
  }
  .add-menu button:hover {
    background: var(--btn-hover-bg);
  }
  .editor-content {
    padding: var(--space-md);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .cards-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  .card-wrapper {
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    display: flex;
    gap: var(--space-md);
    position: relative;
    transition:
      box-shadow 0.2s,
      border-color 0.2s;
  }
  .card-wrapper:focus-within {
    border-color: var(--color-accent);
  }
  .card-type-indicator {
    position: absolute;
    top: -1px;
    left: -1px;
    padding: 3px 10px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    border-radius: var(--radius-md) 0 var(--radius-sm) 0;
    color: white;
  }
  .card-type-indicator.basic {
    background-color: var(--color-accent);
  }
  .card-type-indicator.input {
    background-color: var(--chart-color-2);
  }
  .card-type-indicator.sequencing {
    background-color: var(--chart-color-3);
  }
  .card-inputs {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-top: 1.2rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field label {
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-text-secondary);
    padding-left: var(--space-xs);
  }
  .card-inputs textarea {
    min-height: 40px;
    resize: none;
    overflow: hidden;
  }
  .sequence-items {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sequence-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    border-radius: var(--radius-sm);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
  }
  .sequence-item .drag-handle {
    cursor: grab;
    color: var(--color-text-tertiary);
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  .sequence-item:hover .drag-handle {
    opacity: 1;
  }
  .sequence-item.is-dragging {
    opacity: 0.9;
    transform: scale(1.02);
    box-shadow: var(--shadow-lg);
    background: var(--color-background-raised);
  }
  .sequence-item.drop-target {
    background: hsl(var(--color-accent-hsl) / 0.1);
    box-shadow: inset 0 0 0 2px var(--color-accent);
  }
  .add-item-button {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-accent);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    align-self: flex-start;
    border-radius: var(--radius-sm);
    transition: background-color 0.2s;
  }
  .add-item-button:hover {
    background-color: hsl(var(--color-accent-hsl) / 0.1);
  }
  .remove-card-button,
  .remove-item-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    color: var(--color-text-secondary);
    opacity: 0.6;
    transition: all 0.2s;
  }
  .card-wrapper:hover .remove-card-button,
  .sequence-item:hover .remove-item-button {
    opacity: 1;
  }
  .remove-card-button:hover,
  .remove-item-button:hover {
    color: var(--color-danger);
    background-color: var(--color-danger-bg);
  }
  .empty-state {
    text-align: center;
    color: var(--color-text-secondary);
    padding: var(--space-xl) 0;
  }
  .empty-state h4 {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: var(--space-md) 0 0 0;
  }
  .empty-state p {
    margin: var(--space-xs) 0 0 0;
  }
  @media (min-width: 640px) {
    .panel {
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: var(--width-panel-lg);
      border-radius: var(--radius-lg);
      bottom: var(--space-lg);
      max-height: 80vh;
    }
  }
</style>
