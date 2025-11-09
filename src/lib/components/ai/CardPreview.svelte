<!--
  @file CardPreview.svelte
  @component
  
  @description
  An exceptional, production-ready preview pane for the AI Card Workbench. It renders a list
  of study cards with a robust skeleton loading state, allows for accessible batch selection,
  and uses a stable keying strategy for flawless animations.
-->
<!-- CardPreview.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { SRS } from '$lib/types';
  type Card = SRS.Card;
  type NewCard = SRS.NewCard;
  import { fade } from 'svelte/transition';
  import { t } from '$lib/utils/i18n';

  type PreviewCard = Card | NewCard;

  // --- Props and Events ---
  let { cards, loading = false } = $props<{
    cards: PreviewCard[];
    loading?: boolean;
  }>();

  const dispatch = createEventDispatcher<{
    selectionUpdate: Card[];
  }>();

  // --- State ---
  let selectedCardIds = $state<Set<string>>(new Set());
  let selectAllCheckbox = $state<HTMLInputElement | null>(null);

  // --- NEW: Restore initial communication with the parent ---
  onMount(() => {
    // Inform the parent component of the initial, empty selection state
    // when the component first loads. This allows the parent to proceed
    // with its initial rendering logic.
    dispatch('selectionUpdate', []);
  });

  const cardKeys = new WeakMap<PreviewCard, string>();
  let keyCounter = 0;
  function getCardKey(card: PreviewCard) {
    if (!cardKeys.has(card)) {
      cardKeys.set(card, `card-key-${keyCounter++}`);
    }
    return cardKeys.get(card)!;
  }

  // --- Derived State ---
  const selectableCards = $derived(
    cards.filter((c: PreviewCard): c is Card => 'id' in c)
  );

  const allSelected = $derived(
    selectableCards.length > 0 &&
      selectableCards.every((c: Card) => selectedCardIds.has(c.id))
  );
  const isIndeterminate = $derived(selectedCardIds.size > 0 && !allSelected);

  // --- Effects ---
  $effect(() => {
    if (selectAllCheckbox) {
      selectAllCheckbox.indeterminate = isIndeterminate;
    }
  });

  // This effect cleans up the selection if the `cards` prop changes.
  $effect(() => {
    const visibleCardIds = new Set(selectableCards.map((c) => c.id));
    const newSelection = new Set<string>();

    for (const id of selectedCardIds) {
      if (visibleCardIds.has(id)) {
        newSelection.add(id);
      }
    }

    // Only update state if the new selection is actually different from the old one.
    if (
      newSelection.size !== selectedCardIds.size ||
      [...newSelection].some((id) => !selectedCardIds.has(id))
    ) {
      selectedCardIds = newSelection;
    }
  });

  // --- Event Handlers ---
  function toggleSelectAll() {
    let newSelection: Set<string>;
    if (allSelected) {
      newSelection = new Set();
    } else {
      newSelection = new Set(selectableCards.map((c: Card) => c.id));
    }
    selectedCardIds = newSelection;

    // Dispatch update directly on user action
    const selected = selectableCards.filter((c: Card) =>
      newSelection.has(c.id)
    );
    dispatch('selectionUpdate', selected);
  }

  function handleCardToggle(cardId: string, isChecked: boolean) {
    const newSelection = new Set(selectedCardIds);
    if (isChecked) newSelection.add(cardId);
    else newSelection.delete(cardId);
    selectedCardIds = newSelection;

    // Dispatch update directly on user action
    const selected = selectableCards.filter((c: Card) =>
      newSelection.has(c.id)
    );
    dispatch('selectionUpdate', selected);
  }

  function formatInputPrompt(prompt: string): string {
    return prompt.replace(
      /\{\{\.\.\.\}\}/g,
      '<span class="input-blank">_________</span>'
    );
  }
</script>

<div class="card-preview-container">
  <header class="preview-header">
    <label for="select-all-checkbox" class="select-all-label">
      <input
        id="select-all-checkbox"
        type="checkbox"
        bind:this={selectAllCheckbox}
        checked={allSelected}
        onchange={toggleSelectAll}
        aria-label={$t('card_workbench.select_all_aria_label')}
      />
      <span
        >{allSelected
          ? $t('card_workbench.deselect_all')
          : $t('card_workbench.select_all')}</span
      >
    </label>
    <span class="card-count"
      >{cards.length} {$t('card_workbench.cards_visible')}</span
    >
  </header>

  <div class="card-list">
    {#if loading}
      {#each { length: 3 } as _}
        <div class="card skeleton" in:fade></div>
      {/each}
    {:else}
      {#each cards as card, i (getCardKey(card))}
        {@const isSelectable = 'id' in card}
        {@const isSelected = isSelectable && selectedCardIds.has(card.id)}
        <div class="card" class:selected={isSelected} in:fade>
          <div class="selection-gutter">
            {#if isSelectable}
              <input
                type="checkbox"
                checked={isSelected}
                onchange={(e) =>
                  handleCardToggle(card.id, e.currentTarget.checked)}
                aria-label={`Select card ${i + 1}`}
              />
            {/if}
          </div>
          <div class="card-main">
            <div class="card-header">
              <span class="card-type">{card.type}</span>
            </div>
            <div class="card-content">
              {#if card.type === 'basic'}
                <div class="field">
                  <span class="field-label">Question</span>
                  <p>{card.content.question}</p>
                </div>
                <div class="field">
                  <span class="field-label">Answer</span>
                  <p class="answer">{card.content.answer}</p>
                </div>
              {:else if card.type === 'input'}
                <div class="field">
                  <span class="field-label">Prompt</span>
                  <p>{@html formatInputPrompt(card.content.prompt)}</p>
                </div>
                <div class="field">
                  <span class="field-label">Expected</span>
                  <p class="answer">{card.content.expected}</p>
                </div>
              {:else if card.type === 'sequencing'}
                <div class="field">
                  <span class="field-label">Instruction</span>
                  <p>{card.content.prompt}</p>
                </div>
                <div class="field">
                  <span class="field-label">Sequence</span>
                  <ol class="sequence-list">
                    {#each card.content.items as item}<li>{item}</li>{/each}
                  </ol>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .card-preview-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0 var(--space-sm) 0;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .select-all-label {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.9rem;
    cursor: pointer;
  }
  .card-count {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }
  .card-list {
    flex-grow: 1;
    overflow-y: auto;
    padding: var(--space-sm) 2px;
  }
  .card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-sm);
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-sm);
    margin-bottom: var(--space-md);
    transition: all 0.2s ease;
    border-left: 4px solid transparent;
  }
  .card.selected {
    border-left: 4px solid var(--color-accent);
    background-color: hsl(var(--color-accent-hsl) / 0.05);
  }
  .selection-gutter {
    padding: var(--space-md) var(--space-sm) var(--space-md) var(--space-md);
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  .selection-gutter input {
    cursor: pointer;
    margin-top: 2px;
  }
  .card-main {
    width: 100%;
    overflow: hidden;
  }
  .card-header {
    padding: var(--space-xs) var(--space-md) 0 0;
    font-size: 0.8rem;
  }
  .card-type {
    font-family: var(--font-mono);
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    font-weight: 600;
  }
  .card-content {
    padding: var(--space-xs) var(--space-md) var(--space-md) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .field-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
  .field p {
    margin: 0;
    line-height: 1.6;
    font-size: 0.95rem;
  }
  .field .answer {
    background-color: var(--color-success-bg);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-sm);
    color: var(--color-success-text);
    border: 1px solid var(--color-success-border);
    align-self: flex-start;
    max-width: 100%;
  }
  .sequence-list {
    margin: 0;
    padding-left: var(--space-lg);
  }
  .sequence-list li {
    margin-bottom: var(--space-xs);
  }
  :global(.input-blank) {
    font-family: var(--font-mono);
    color: var(--color-accent);
    font-weight: 600;
  }
  .skeleton {
    height: 150px;
    background-color: var(--color-gray-100);
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.6;
    }
  }
  :global(.dark-theme) .skeleton {
    background-color: var(--color-gray-800);
  }
  :global(.dark-theme) .preview-header {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .card {
    background-color: var(--color-background-dark);
    border-color: var(--color-border-dark);
  }
</style>
