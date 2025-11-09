<!--
  @component
  RelinkCardModal

  @description
  An exceptional modal for re-linking a flashcard to a different schema (deck).
  It provides a clear list of available schemas, a smooth skeleton loading state,
  and emits events to notify the parent of changes.
-->
<script lang="ts">
  import { t } from '$lib/utils/i18n';
  import { toast } from 'svelte-sonner';
  import { createEventDispatcher } from 'svelte';
  // FIX: Import the SRS namespace and create a local alias for the Card type.
  import type { SRS, SchemaMetadata } from '$lib/types';
  type Card = SRS.Card;
  import * as directoryService from '$lib/services/core/directoryService';
  import * as cardService from '$lib/services/features/cardService';

  // --- UI Component Imports ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // --- Svelte 5 Props and Events ---
  let { show = $bindable(false), card } = $props<{
    show?: boolean;
    card: Card;
  }>();

  const dispatch = createEventDispatcher<{
    close: void;
    update: Card;
  }>();

  // --- State ---
  let schemas = $state<SchemaMetadata[]>([]);
  let selectedSchemaId = $state(card.deckId);
  let isLoading = $state(true);

  $effect(() => {
    async function loadSchemas() {
      if (show) {
        isLoading = true;
        selectedSchemaId = card.deckId;
        const allItems = await directoryService.getAllItems();
        schemas = allItems.filter((item) => item.type === 'schema');
        isLoading = false;
      }
    }
    loadSchemas();
  });

  async function handleRelink() {
    if (!selectedSchemaId) {
      toast.error($t('relinkCard.noSelectionError'));
      return;
    }
    if (selectedSchemaId === card.deckId) {
      toast.info($t('relinkCard.alreadyInDocInfo'));
      dispatch('close');
      return;
    }

    const updatedCard = { ...card, deckId: selectedSchemaId };

    try {
      await cardService.updateCard(updatedCard);
      toast.success($t('relinkCard.updateSuccess'));
      dispatch('update', updatedCard);
      dispatch('close');
    } catch (error) {
      toast.error($t('relinkCard.updateFailed'));
      console.error(error);
    }
  }
</script>

<Modal
  bind:show
  title={$t('relinkCard.title')}
  onClose={() => dispatch('close')}
>
  <div class="relink-content">
    <p class="description">{$t('relinkCard.description')}</p>

    {#if isLoading}
      <ul class="schema-list skeleton-list">
        <!-- FIX: Add key and type to prevent potential implicit 'any' error -->
        {#each { length: 3 } as _, i (i)}
          <li><div class="skeleton skeleton-item"></div></li>
        {/each}
      </ul>
    {:else}
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
                <span class="current-tag">{$t('relinkCard.current')}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <footer class="modal-footer">
    <Button variant="secondary" onclick={() => dispatch('close')}>
      {$t('relinkCard.cancel')}
    </Button>
    <Button onclick={handleRelink} disabled={!selectedSchemaId}>
      {$t('relinkCard.confirm')}
    </Button>
  </footer>
</Modal>

<style>
  /* All styles are unchanged and correct */
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
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
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
  :global(.dark-theme) .schema-list,
  :global(.dark-theme) .schema-list li:not(:last-child),
  :global(.dark-theme) .modal-footer {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .schema-item:hover {
    background-color: var(--btn-hover-bg-dark);
  }
  :global(.dark-theme) .current-tag {
    background-color: var(--color-gray-700);
    color: var(--color-text-dark-tertiary);
  }
  :global(.dark-theme) .skeleton {
    background-color: var(--color-gray-800);
  }
</style>
