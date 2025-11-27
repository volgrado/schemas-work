<!--
  @component
  RelinkCardModal

  @description
  An exceptional modal for re-linking a flashcard to a different schema (deck).

  Features:
  - **Schema Browsing:** Lists all available documents (decks) for selection.
  - **Validation:** Prevents re-linking to the same deck or invalid targets.
  - **Async State:** Displays a skeleton loader while fetching metadata.
  - **Events:** Emits update events to parent components.

  @props
  - `show` (bindable boolean): Visibility control.
  - `card` (Card): The card object being modified.
  - `onClose` (function): Close callback.
  - `onUpdate` (function): Success callback with the modified card.
-->
<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import { toast } from 'svelte-sonner';
  import type { SRS, SchemaMetadata } from '$lib/types';
  import { fileSystemStore } from '@modules/file-system';
  import * as cardService from '$lib/modules/study/domain/cardService';

  // --- UI Component Imports ---
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';

  type Card = SRS.Card;

  // --- Props ---
  let {
    show = $bindable(false),
    card,
    onClose,
    onUpdate,
  } = $props<{
    show?: boolean;
    card: Card;
    onClose?: () => void;
    onUpdate?: (card: Card) => void;
  }>();

  // --- State ---
  let schemas = $state<SchemaMetadata[]>([]);
  let selectedSchemaId = $state(card.deckId);
  let isLoading = $state(true);

  // --- Effects ---
  $effect(() => {
    async function loadSchemas() {
      if (show) {
        isLoading = true;
        selectedSchemaId = card.deckId;
        // Fetch available schemas synchronously from the store cache
        const allItems = fileSystemStore.getAll();
        schemas = allItems.filter((item) => item.type === 'schema');
        isLoading = false;
      }
    }
    loadSchemas();
  });

  // --- Actions ---
  async function handleRelink() {
    if (!selectedSchemaId) {
      toast.error(i18n.t('relinkCard.noSelectionError'));
      return;
    }
    if (selectedSchemaId === card.deckId) {
      toast.info(i18n.t('relinkCard.alreadyInDocInfo'));
      onClose?.();
      return;
    }

    const updatedCard = { ...card, deckId: selectedSchemaId };

    try {
      await cardService.updateCard(updatedCard);
      toast.success(i18n.t('relinkCard.updateSuccess'));
      onUpdate?.(updatedCard);
      onClose?.();
    } catch (error) {
      toast.error(i18n.t('relinkCard.updateFailed'));
      console.error(error);
    }
  }
</script>

<Modal bind:show title={i18n.t('relinkCard.title')} onClose={() => onClose?.()}>
  <div class="relink-content">
    <p class="description">{i18n.t('relinkCard.description')}</p>

    {#if isLoading}
      <!-- Loading Skeletons -->
      <ul class="schema-list skeleton-list">
        {#each { length: 3 } as _, i (i)}
          <li><div class="skeleton skeleton-item"></div></li>
        {/each}
      </ul>
    {:else}
      <!-- Schema List -->
      <ul class="schema-list">
        {#each schemas as schema (schema.id)}
          <li>
            <button
              class="schema-item"
              class:selected={selectedSchemaId === schema.id}
              onclick={() => (selectedSchemaId = schema.id)}
            >
              <Icon name="file-text" size={16} />
              <span class="schema-title">{schema.title}</span>
              {#if schema.id === card.deckId}
                <span class="current-tag">{i18n.t('relinkCard.current')}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <footer class="modal-footer">
    <Button variant="secondary" onclick={() => onClose?.()}>
      {i18n.t('relinkCard.cancel')}
    </Button>
    <Button onclick={handleRelink} disabled={!selectedSchemaId}>
      {i18n.t('relinkCard.confirm')}
    </Button>
  </footer>
</Modal>

<style>
  .description {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-md);
  }
  .schema-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 40vh;
    overflow-y: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
  }
  .schema-list li:not(:last-child) {
    border-bottom: 1px solid var(--color-border);
  }
  .schema-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background-color 0.15s ease;
  }
  .schema-item:hover {
    background-color: var(--btn-hover-bg);
  }
  .schema-item.selected {
    background-color: hsl(var(--color-accent-hsl) / 0.1);
    color: var(--color-accent);
    font-weight: 600;
  }
  .schema-title {
    flex-grow: 1;
  }
  .current-tag {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    background-color: var(--color-gray-100);
    padding: 2px 6px;
    border-radius: var(--border-radius-sm);
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }
  .skeleton {
    background-color: var(--color-gray-100);
    border-radius: var(--border-radius-md);
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.6;
    }
  }
  .skeleton-list {
    border-color: transparent;
  }
  .skeleton-item {
    height: 40px;
    width: 100%;
  }

  :global(.dark-theme) .current-tag {
    background-color: var(--color-gray-700);
    color: var(--color-text-dark-tertiary);
  }
  :global(.dark-theme) .skeleton {
    background-color: var(--color-gray-800);
  }
</style>
