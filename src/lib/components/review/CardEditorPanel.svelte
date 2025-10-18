<!-- src/lib/components/review/CardEditorPanel.svelte (FINAL Version) -->
<script lang="ts">
  // --- Svelte Core ---
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { flip } from 'svelte/animate';
  import { toast } from 'svelte-sonner';
  import { onMount, onDestroy } from 'svelte';

  // --- Application Logic ---
  import { cardEditorStore } from '$lib/stores/cardEditorStore';
  import type { Card, CardType } from '$lib/types';
  import { debounce } from '$lib/utils/debounce';
  import { autosize } from '$lib/actions/autosize';

  // --- UI Components ---
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import HelpTooltip from '$lib/components/ui/HelpTooltip.svelte'; // Make sure this is the improved component

  // --- State and Variables ---
  let showAddMenu = $state(false);
  let cardElements = new Map<string, HTMLElement>();
  let draggedItemIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);

  // --- Logic for dynamic popover ---
  let addCardContainerEl = $state<HTMLElement | undefined>();
  let addMenuEl = $state<HTMLElement | undefined>();
  let menuOpensDown = $state(false);

  function calculateMenuDirection() {
    if (!addCardContainerEl || !addMenuEl) return;
    const containerRect = addCardContainerEl.getBoundingClientRect();
    const menuHeight = addMenuEl.offsetHeight;
    const spaceAbove = containerRect.top;
    menuOpensDown = spaceAbove < menuHeight + 20;
  }

  $effect(() => {
    if (showAddMenu) {
      setTimeout(calculateMenuDirection, 0);
    }
  });

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

  function register(node: HTMLElement, id: string) {
    cardElements.set(id, node);
    return {
      destroy() {
        cardElements.delete(id);
      },
    };
  }

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

  // --- RESTORED: Function to delete with undo option ---
  async function removeCard(cardId: string) {
    const deletedCard = await cardEditorStore.deleteCard(cardId);
    if (deletedCard) {
      toast.success('Card deleted.', {
        action: {
          label: 'Undo',
          onClick: () => cardEditorStore.restoreCard(deletedCard),
        },
      });
    }
  }

  function addSequenceItem(card: Card) {
    if (card.type === 'sequencing') {
      card.content.items.push('');
      card.content.items = card.content.items;
      handleUpdate(card);
    }
  }
  function removeSequenceItem(card: Card, itemIndex: number) {
    if (card.type === 'sequencing') {
      card.content.items.splice(itemIndex, 1);
      card.content.items = card.content.items;
      handleUpdate(card);
    }
  }
  function handleClose() {
    cardEditorStore.close();
  }

  // Drag and Drop Logic
  function handleDragStart(index: number, event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
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
        cardEditorStore.clearLastAdded();
      }
    }
  });
</script>

{#if $cardEditorStore.isOpen}
  <div
    class="overlay"
    on:click={handleClose}
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    class="panel"
    transition:fly={{ y: 100, duration: 250, easing: quintOut }}
    role="dialog"
  >
    <header class="header">
      <div class="header-left">
        <div class="header-title">
          <h3 id="panel-title">Study Cards</h3>
          <HelpTooltip>
            Create questions and answers for this node. Use them in "Review Mode" to memorize key concepts.
          </HelpTooltip>
        </div>
        {#if $cardEditorStore.status !== 'idle'}
          <div class="save-status" in:fade={{ duration: 100 }}>
            {#if $cardEditorStore.status === 'saving'}
              <Icon name="loader" size={14} class="spinner" />
              <span>Saving...</span>
            {:else if $cardEditorStore.status === 'saved'}
              <Icon name="check-circle" size={14} />
              <span>Saved</span>
            {/if}
          </div>
        {/if}
      </div>

      <div class="header-actions">
        <div class="add-card-container" bind:this={addCardContainerEl}>
          <Button
            variant="secondary"
            size="sm"
            onclick={() => (showAddMenu = !showAddMenu)}
          >
            <Icon name="plus" size={16} />Add Card
          </Button>
          {#if showAddMenu}
            <div
              class="add-menu"
              class:opens-down={menuOpensDown}
              bind:this={addMenuEl}
              transition:fade={{ duration: 100 }}
            >
              <button on:click={() => addCard('basic')}
                ><Icon name="pen-tool" size={16} /> Basic (Q/A)</button
              >
              <button on:click={() => addCard('input')}
                ><Icon name="edit-3" size={16} /> Fill in the Blank</button
              >
              <button on:click={() => addCard('sequencing')}
                ><Icon name="list" size={16} /> Sequence</button
              >
            </div>
          {/if}
        </div>
        <Button onclick={handleClose} variant="primary" size="sm">Done</Button>
      </div>
    </header>

    <div class="editor-content">
      {#if $cardEditorStore.fetchStatus === 'loading'}
        <!-- Loading State -->
      {:else if $cardEditorStore.fetchStatus === 'error'}
        <!-- Error State -->
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
                <!-- RESTORED: Complete logic for each card type -->
                {#if card.type === 'basic'}
                  <div class="field">
                    <label for="q-{card.id}">Question</label>
                    <input
                      id="q-{card.id}"
                      type="text"
                      placeholder="Write the question..."
                      bind:value={card.content.question}
                      on:input={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="a-{card.id}">Answer</label>
                    <textarea
                      id="a-{card.id}"
                      placeholder="Write the answer..."
                      bind:value={card.content.answer}
                      on:input={() => handleUpdate(card)}
                      use:autosize
                    ></textarea>
                  </div>
                {:else if card.type === 'input'}
                  <div class="field">
                    <label for="p-{card.id}"
                      >Prompt (use {'{{...}}'} for the blank)</label
                    >
                    <input
                      id="p-{card.id}"
                      type="text"
                      placeholder={'e.g., The capital of France is {{...}}'}
                      bind:value={card.content.prompt}
                      on:input={() => handleUpdate(card)}
                    />
                  </div>
                  <div class="field">
                    <label for="e-{card.id}">Expected Answer</label>
                    <input
                      id="e-{card.id}"
                      type="text"
                      placeholder="e.g., Paris"
                      bind:value={card.content.expected}
                      on:input={() => handleUpdate(card)}
                    />
                  </div>
                {:else if card.type === 'sequencing'}
                  <div class="field">
                    <label for="s-{card.id}">Instruction</label>
                    <input
                      id="s-{card.id}"
                      type="text"
                      placeholder="e.g., Order the following steps..."
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
                          placeholder="Sequence item..."
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
                    ><Icon name="plus" size={14} /> Add Item</button
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
        <!-- Empty State -->
      {/if}
    </div>
  </div>
{/if}

<style>
  /* The CSS from the previous response is perfect and does not need changes. 
     It is kept here for completeness. */
  .panel {
    --theme-bg-primary: #1e1f22;
    --theme-bg-secondary: #2b2c31;
    --theme-bg-tertiary: #35363b;
    --theme-border: #3c3d42;
    --theme-text-primary: #e0e2e5;
    --theme-text-secondary: #94969a;
    --theme-accent-orange: #e86339;
    --theme-accent-red: #d9534f;
    --indicator-basic: #5895f7;
    --indicator-input: #34c759;
    --indicator-sequencing: #f5a623;
    --shadow-menu: 0 5px 15px rgba(0, 0, 0, 0.3);
    --shadow-panel: 0 -8px 32px rgba(0, 0, 0, 0.25);
    --z-overlay: 100;
    --z-panel: 101;
    --z-menu: 110;
  }
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    z-index: var(--z-overlay);
    border: none;
  }
  .panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: var(--z-panel);
    background-color: var(--theme-bg-primary);
    border-top: 1px solid var(--theme-border);
    border-radius: var(--space-md) var(--space-md) 0 0;
    box-shadow: var(--shadow-panel);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }
  .editor-content {
    padding: var(--space-md);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--theme-border);
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
    color: var(--theme-text-primary);
  }
  .cards-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  .card-wrapper {
    background-color: var(--theme-bg-secondary);
    border: 1px solid var(--theme-border);
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
    color: rgba(255, 255, 255, 0.9);
  }
  .card-type-indicator.basic {
    background-color: var(--indicator-basic);
  }
  .card-type-indicator.input {
    background-color: var(--indicator-input);
  }
  .card-type-indicator.sequencing {
    background-color: var(--indicator-sequencing);
  }
  .card-inputs {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding-top: 1.2rem;
  }
  .field label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--theme-text-secondary);
    padding-left: var(--space-xs);
  }
  .card-inputs input,
  .card-inputs textarea {
    width: 100%;
    padding: var(--space-sm);
    font-family: inherit;
    font-size: 0.95rem;
    background-color: var(--theme-bg-tertiary);
    border: 1px solid var(--theme-bg-tertiary);
    border-radius: var(--space-sm);
    color: var(--theme-text-primary);
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }
  .card-inputs input:focus-visible,
  .card-inputs textarea:focus-visible {
    outline: none;
    background-color: var(--theme-bg-secondary);
    border-color: var(--color-accent);
  }
  .card-inputs textarea {
    min-height: 40px;
    resize: none;
    overflow: hidden;
  }
  .add-card-container {
    position: relative;
  }
  .add-menu {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 220px;
    z-index: var(--z-menu);
    background: var(--theme-bg-secondary);
    border-radius: var(--space-sm);
    box-shadow: var(--shadow-menu);
    border: 1px solid var(--theme-border);
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
    color: var(--theme-text-primary);
    transition: background-color 0.15s ease;
  }
  .add-menu button:hover {
    background: var(--theme-bg-tertiary);
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
    border-radius: var(--space-sm);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
  }
  .sequence-item .drag-handle {
    cursor: grab;
    color: var(--theme-text-secondary);
    opacity: 0.5;
    transition: opacity 0.2s;
  }
  .sequence-item:hover .drag-handle {
    opacity: 1;
  }
  .sequence-item.is-dragging {
    opacity: 0.9;
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    background: var(--theme-bg-tertiary);
  }
  .sequence-item.drop-target {
    background: hsla(var(--color-accent-hsl), 0.15);
    box-shadow: inset 0 0 0 2px var(--color-accent);
  }
  :global(.header-actions .button.variant-primary) {
    background-color: var(--theme-accent-orange);
    color: white;
  }
  :global(.header-actions .button.variant-secondary) {
    background-color: var(--theme-bg-tertiary);
    color: var(--theme-text-primary);
    border: none;
  }
  .add-item-button {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--theme-accent-orange);
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
    background-color: rgba(232, 99, 57, 0.1);
  }
  .remove-card-button,
  .remove-item-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    color: var(--theme-text-secondary);
    opacity: 0.6;
    transition: all 0.2s;
  }
  .card-wrapper:hover .remove-card-button,
  .sequence-item:hover .remove-item-button {
    opacity: 1;
  }
  .remove-card-button:hover,
  .remove-item-button:hover {
    color: var(--theme-accent-red);
    background-color: var(--theme-bg-tertiary);
  }
  @media (min-width: 640px) {
    .panel {
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 720px;
      border-radius: var(--space-lg);
      bottom: var(--space-lg);
      max-height: 80vh;
      border: 1px solid var(--theme-border);
    }
  }
</style>
