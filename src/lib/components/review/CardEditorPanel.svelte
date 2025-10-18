<!--
  @component
  CardEditorPanel

  This component provides a full-featured, slide-up panel for creating, editing, and managing
  all the flashcards associated with a specific document node. It acts as a self-contained
  editing environment, handling multiple card types, real-time updates, and complex UI interactions.

  Key Features:
  - Manages its own state via the `cardEditorStore`, fetching and saving cards for a given node.
  - Supports the creation and editing of `basic`, `input`, and `sequencing` card types.
  - Uses a debounced update mechanism (`debounce`) to save changes automatically and efficiently as the user types.
  - Implements an "undo" feature for card deletion using `svelte-sonner` toasts.
  - Employs the `flip` animation from `svelte/animate` for smooth reordering of cards.
  - Uses a custom `autosize` Svelte action for textareas.
  - Manages focus and scrolling, automatically bringing new or selected cards into view.
  - Includes drag-and-drop functionality for reordering items within a `sequencing` card.
-->
<script lang="ts">
  // --- Svelte Core & UI Libraries ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { flip } from 'svelte/animate';
  import { onMount, onDestroy } from 'svelte';
  import { toast } from 'svelte-sonner';

  // --- Stores, Actions, and Utilities ---
  import { t } from '$lib/utils/i18n';
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import { debounce } from '$lib/utils/debounce';
  import { autosize } from '$lib/actions/autosize';
  import type { Card, CardType } from '$lib/types';

  // --- UI Components ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte';

  // --- Component State (Svelte 5 Runes) ---
  let showAddMenu = $state(false);
  let cardElements = new Map<string, HTMLElement>();

  // Drag & Drop state for sequence items
  let draggedItemIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);

  // State for dynamically positioning the "Add Card" popover menu
  let addCardContainerEl = $state<HTMLElement | undefined>();
  let addMenuEl = $state<HTMLElement | undefined>();
  let menuOpensDown = $state(false);

  /**
   * Calculates whether the "Add Card" menu should open upwards or downwards
   * based on the available space in the viewport.
   */
  function calculateMenuDirection() {
    if (!addCardContainerEl || !addMenuEl) return;
    const containerRect = addCardContainerEl.getBoundingClientRect();
    const menuHeight = addMenuEl.offsetHeight;
    const spaceAbove = containerRect.top;
    // If there isn't enough space above for the menu, open it downwards.
    menuOpensDown = spaceAbove < menuHeight + 20;
  }

  // Recalculate menu direction when it opens.
  $effect(() => {
    if (showAddMenu) {
      setTimeout(calculateMenuDirection, 0); // Use timeout to wait for DOM rendering
    }
  });

  /**
   * Handles clicks outside the "Add Card" menu to close it.
   */
  function handleClickOutside(event: MouseEvent) {
    if (
      showAddMenu &&
      addCardContainerEl &&
      !addCardContainerEl.contains(event.target as Node)
    ) {
      showAddMenu = false;
    }
  }

  onMount(() => document.addEventListener('click', handleClickOutside, true));
  onDestroy(() =>
    document.removeEventListener('click', handleClickOutside, true)
  );

  /**
   * Registers a card's root DOM element against its ID for later retrieval.
   * Used for scrolling the card into view.
   */
  function register(node: HTMLElement, id: string) {
    cardElements.set(id, node);
    return {
      destroy() {
        cardElements.delete(id);
      },
    };
  }

  // --- Card Data Operations ---

  // Debounce card updates to prevent excessive saving while the user is typing.
  const debouncedUpdateCard = debounce(
    (card: Card) => cardEditorStore.updateCard(card),
    500
  );

  function handleUpdate(card: Card) {
    debouncedUpdateCard(card);
  }

  function addCard(type: CardType) {
    cardEditorStore.addCard(type);
    showAddMenu = false;
  }

  /**
   * Deletes a card and shows a toast notification with an "Undo" action.
   * @param {string} cardId - The ID of the card to delete.
   */
  async function removeCard(cardId: string) {
    const deletedCard = await cardEditorStore.deleteCard(cardId);
    if (deletedCard) {
      toast.success($t('card_editor_panel.card_deleted_toast'), {
        action: {
          label: $t('card_editor_panel.undo_button'),
          onClick: () => cardEditorStore.restoreCard(deletedCard),
        },
      });
    }
  }

  // --- Sequencing Card Specific Logic ---

  function addSequenceItem(card: Card) {
    if (card.type === 'sequencing') {
      card.content.items.push('');
      card.content.items = card.content.items; // Trigger reactivity
      handleUpdate(card);
    }
  }

  function removeSequenceItem(card: Card, itemIndex: number) {
    if (card.type === 'sequencing') {
      card.content.items.splice(itemIndex, 1);
      card.content.items = card.content.items; // Trigger reactivity
      handleUpdate(card);
    }
  }

  // --- Drag & Drop for Sequence Items ---

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

  /**
   * This effect hook manages scrolling and focusing on newly added cards.
   * When `lastAddedCardId` changes, it finds the corresponding element and brings it into view.
   */
  $effect(() => {
    const newCardId = $cardEditorStore.lastAddedCardId;
    if (newCardId) {
      const element = cardElements.get(newCardId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = element.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >('input, textarea');
        firstInput?.focus();
        cardEditorStore.clearLastAdded(); // Reset the trigger
      }
    }
  });
</script>

{#if $cardEditorStore.isOpen}
  <!-- Overlay to capture clicks and close the panel -->
  <div
    class="overlay"
    on:click={() => cardEditorStore.close()}
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    class="panel"
    transition:fly={{ y: 100, duration: 250, easing: quintOut }}
    role="dialog"
  >
    <!-- Panel Header: Title, Save Status, and Actions -->
    <header class="header">
      <div class="header-left">
        <div class="header-title">
          <h3 id="panel-title">{$t('card_editor_panel.title')}</h3>
          <HelpTooltip>{$t('card_editor_panel.tooltip')}</HelpTooltip>
        </div>
        <!-- Live save status indicator -->
        {#if $cardEditorStore.status !== 'idle'}
          <div class="save-status" in:fade={{ duration: 100 }}>
            {#if $cardEditorStore.status === 'saving'}
              <Icon name="loader" size={14} class="spinner" />
              <span>{$t('card_editor_panel.saving')}</span>
            {:else if $cardEditorStore.status === 'saved'}
              <Icon name="check-circle" size={14} />
              <span>{$t('card_editor_panel.saved')}</span>
            {/if}
          </div>
        {/if}
      </div>

      <div class="header-actions">
        <!-- "Add Card" button and dynamic popover menu -->
        <div class="add-card-container" bind:this={addCardContainerEl}>
          <Button
            variant="secondary"
            size="sm"
            onclick={() => (showAddMenu = !showAddMenu)}
          >
            <Icon name="plus" size={16} />{$t('card_editor_panel.add_card')}
          </Button>
          {#if showAddMenu}
            <div
              class="add-menu"
              class:opens-down={menuOpensDown}
              bind:this={addMenuEl}
              transition:fade={{ duration: 100 }}
            >
              <button on:click={() => addCard('basic')}
                ><Icon name="pen-tool" size={16} />
                {$t('card_editor_panel.add_basic')}</button
              >
              <button on:click={() => addCard('input')}
                ><Icon name="edit-3" size={16} />
                {$t('card_editor_panel.add_input')}</button
              >
              <button on:click={() => addCard('sequencing')}
                ><Icon name="list" size={16} />
                {$t('card_editor_panel.add_sequence')}</button
              >
            </div>
          {/if}
        </div>
        <Button
          onclick={() => cardEditorStore.close()}
          variant="primary"
          size="sm">{$t('card_editor_panel.done')}</Button
        >
      </div>
    </header>

    <!-- Main content area for the card list -->
    <div class="editor-content">
      {#if $cardEditorStore.fetchStatus === 'loading'}
        <p>{$t('card_editor_panel.loading')}</p>
        <!-- Basic loading state -->
      {:else if $cardEditorStore.fetchStatus === 'error'}
        <p>{$t('card_editor_panel.load_error')}</p>
        <!-- Basic error state -->
      {:else if $cardEditorStore.cards.length > 0}
        <div class="cards-list">
          {#each $cardEditorStore.cards as card (card.id)}
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
                <!-- Card Type: Basic Q&A -->
                {#if card.type === 'basic'}
                  <div class="field">
                    <label for="q-{card.id}"
                      >{$t('card_editor_panel.question_label')}</label
                    ><input
                      id="q-{card.id}"
                      type="text"
                      placeholder={$t('card_editor_panel.question_placeholder')}
                      bind:value={card.content.question}
                      on:input={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="a-{card.id}"
                      >{$t('card_editor_panel.answer_label')}</label
                    ><textarea
                      id="a-{card.id}"
                      placeholder={$t('card_editor_panel.answer_placeholder')}
                      bind:value={card.content.answer}
                      on:input={() => handleUpdate(card)}
                      use:autosize
                    ></textarea>
                  </div>

                  <!-- Card Type: Input -->
                {:else if card.type === 'input'}
                  <div class="field">
                    <label for="p-{card.id}"
                      >{$t('card_editor_panel.prompt_label')}</label
                    ><input
                      id="p-{card.id}"
                      type="text"
                      placeholder={$t('card_editor_panel.prompt_placeholder')}
                      bind:value={card.content.prompt}
                      on:input={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="e-{card.id}"
                      >{$t('card_editor_panel.expected_answer_label')}</label
                    ><input
                      id="e-{card.id}"
                      type="text"
                      placeholder={$t(
                        'card_editor_panel.expected_answer_placeholder'
                      )}
                      bind:value={card.content.expected}
                      on:input={() => handleUpdate(card)}
                    />
                  </div>

                  <!-- Card Type: Sequencing -->
                {:else if card.type === 'sequencing'}
                  <div class="field">
                    <label for="s-{card.id}"
                      >{$t('card_editor_panel.instruction_label')}</label
                    ><input
                      id="s-{card.id}"
                      type="text"
                      placeholder={$t(
                        'card_editor_panel.instruction_placeholder'
                      )}
                      bind:value={card.content.prompt}
                      on:input={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="sequence-items">
                    {#each card.content.items as item, itemIndex (itemIndex)}
                      <div
                        class="sequence-item"
                        role="option"
                        tabindex="0"
                        animate:flip={{ duration: 250 }}
                        draggable="true"
                        on:dragstart={(e) => handleDragStart(itemIndex, e)}
                        on:dragover={(e) => handleDragOver(itemIndex, e)}
                        on:drop|preventDefault={(e) =>
                          handleDrop(itemIndex, card)}
                        on:dragend={resetDragState}
                        class:is-dragging={draggedItemIndex === itemIndex}
                        class:drop-target={dropTargetIndex === itemIndex &&
                          draggedItemIndex !== itemIndex}
                      >
                        <span class="drag-handle">::</span>
                        <input
                          type="text"
                          placeholder={$t(
                            'card_editor_panel.sequence_item_placeholder'
                          )}
                          bind:value={card.content.items[itemIndex]}
                          on:input={() => handleUpdate(card)}
                        />
                        <button
                          class="remove-item-button"
                          on:click={() => removeSequenceItem(card, itemIndex)}
                          ><Icon name="x" size={14} /></button
                        >
                      </div>
                    {/each}
                  </div>
                  <button
                    class="add-item-button"
                    on:click={() => addSequenceItem(card)}
                    ><Icon name="plus" size={14} />
                    {$t('card_editor_panel.add_item')}</button
                  >
                {/if}
              </div>
              <button
                class="remove-card-button"
                on:click={() => removeCard(card.id)}
                ><Icon name="trash-2" size={16} /></button
              >
            </div>
          {/each}
        </div>
      {:else}
        <!-- Empty state when no cards have been created yet -->
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
  /* --- Main Panel & Overlay --- */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    z-index: var(--z-overlay, 100);
    border: none;
  }
  .panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--z-panel, 101);
    background-color: var(--color-background);
    border-top: 1px solid var(--color-border);
    border-radius: var(--space-md) var(--space-md) 0 0;
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }

  /* --- Header --- */
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
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  /* --- Save Status Indicator --- */
  .save-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--color-gray-500);
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .spinner {
    animation: spin 1s linear infinite;
  }

  /* --- Add Card Menu --- */
  .add-card-container {
    position: relative;
  }
  .add-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 220px;
    z-index: var(--z-menu, 110);
    background: var(--color-background-raised);
    border-radius: var(--space-sm);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
    padding: var(--space-xs);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .add-menu.opens-down {
    bottom: auto;
    top: calc(100% + 8px);
  }
  .add-menu button {
    width: 100%;
    text-align: left;
    padding: var(--space-sm) var(--space-md);
    background: none;
    border: none;
    border-radius: var(--space-xs);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--color-text);
    transition: background-color 0.15s ease;
  }
  .add-menu button:hover {
    background: var(--color-gray-100);
  }

  /* --- Content & Card List --- */
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

  /* --- Individual Card Styling --- */
  .card-wrapper {
    background-color: var(--color-background-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--space-md);
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
    border-radius: var(--space-md) 0 var(--space-sm) 0;
    color: white;
  }
  .card-type-indicator.basic {
    background-color: var(--color-blue-500);
  }
  .card-type-indicator.input {
    background-color: var(--color-green-500);
  }
  .card-type-indicator.sequencing {
    background-color: var(--color-orange-500);
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
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-gray-600);
    padding-left: var(--space-xs);
  }
  .card-inputs input,
  .card-inputs textarea {
    width: 100%;
    padding: var(--space-sm);
    font-family: inherit;
    font-size: 0.95rem;
    background-color: var(--color-gray-50);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--space-sm);
    color: var(--color-text);
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }
  .card-inputs input:focus-visible,
  .card-inputs textarea:focus-visible {
    outline: none;
    background-color: var(--color-background);
    border-color: var(--color-accent);
  }
  .card-inputs textarea {
    min-height: 40px;
    resize: none;
    overflow: hidden;
  }

  /* --- Sequencing Card Specifics --- */
  .sequence-items {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sequence-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    border-radius: var(--space-sm);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
  }
  .sequence-item .drag-handle {
    cursor: grab;
    color: var(--color-gray-400);
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
    font-size: 0.85rem;
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
    border-radius: var(--space-xs);
    transition: background-color 0.2s;
  }
  .add-item-button:hover {
    background-color: hsl(var(--color-accent-hsl) / 0.1);
  }

  /* --- Action Buttons --- */
  .remove-card-button,
  .remove-item-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    color: var(--color-gray-500);
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
    background-color: var(--color-gray-100);
  }

  /* --- Empty State --- */
  .empty-state {
    text-align: center;
    color: var(--color-gray-500);
    padding: var(--space-xl) 0;
  }
  .empty-state h4 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: var(--space-md) 0 0 0;
  }
  .empty-state p {
    margin: var(--space-xs) 0 0 0;
  }

  /* --- Dark Mode Styles --- */
  @media (prefers-color-scheme: dark) {
    .header,
    .panel {
      border-color: var(--color-border-dark);
    }
    .add-menu {
      background-color: var(--color-background-dark-raised);
      border-color: var(--color-border-dark);
    }
    .add-menu button:hover {
      background: var(--color-gray-800);
    }
    .card-wrapper {
      background-color: var(--color-background-dark-raised);
      border-color: var(--color-border-dark);
    }
    .card-inputs input,
    .card-inputs textarea {
      background-color: var(--color-gray-900);
      border-color: var(--color-gray-700);
      color: var(--color-text-dark);
    }
    .card-inputs input:focus-visible,
    .card-inputs textarea:focus-visible {
      background-color: var(--color-background-dark);
      border-color: var(--color-accent);
    }
    .remove-card-button:hover,
    .remove-item-button:hover {
      background-color: var(--color-gray-800);
    }
  }

  /* --- Responsive Adjustments --- */
  @media (min-width: 640px) {
    .panel {
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 720px;
      border-radius: var(--space-lg);
      bottom: var(--space-lg);
      max-height: 80vh;
    }
  }
</style>
