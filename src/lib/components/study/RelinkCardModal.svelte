<!--
  @component
  RelinkCardModal

  A modal that allows a user to change the source document (node) of a flashcard.
  It presents a list of all available documents, and upon selection, updates the card's `nodeId`
  to link it to the new document.

  Props:
  - `card`: {Card} - The card to be re-linked.
  - `onclose`: {() => void} - Callback fired when the modal is closed.
  - `onupdate`: {(card: Card) => void} - Callback fired with the updated card upon a successful re-link.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Card, SchemaMetadata } from '$lib/types';
  import * as directoryService from '$lib/services/core/directoryService';
  import * as cardService from '$lib/services/features/cardService';
  import { toast } from 'svelte-sonner';

  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  type Events = {
    close: () => void;
    update: (card: Card) => void;
  };

  let {
    /**
     * @prop {Card} card
     * The card to be re-linked.
     */
    card,
    /**
     * @prop {() => void} [onclose]
     * Callback fired when the modal is closed.
     */
    onclose,
    /**
     * @prop {(card: Card) => void} [onupdate]
     * Callback fired with the updated card upon a successful re-link.
     */
    onupdate,
  } = $props<{
    card: Card;
    onclose?: Events['close'];
    onupdate?: Events['update'];
  }>();

  let schemas = $state<SchemaMetadata[]>([]);
  let selectedSchemaId = $state<string | null>(null);
  let isLoading = $state(true);

  onMount(async () => {
    const allItems = await directoryService.getAllItems();
    schemas = allItems.filter((item) => item.type === 'schema');
    isLoading = false;
  });

  async function handleRelink() {
    if (!selectedSchemaId) {
      toast.error('Please select a new document.');
      return;
    }
    if (selectedSchemaId === card.deckId) {
      toast.info('Card is already in this document.');
      onclose?.();
      return;
    }

    const updatedCard = { ...card, deckId: selectedSchemaId };

    try {
      await cardService.updateCard(updatedCard);
      toast.success('Card source updated successfully.');
      onupdate?.(updatedCard); // Call prop directly
      onclose?.(); // Call prop directly
    } catch (error) {
      toast.error('Failed to update card source.');
      console.error(error);
    }
  }
</script>

=<Modal onClose={() => onclose?.()} title="Change Card Source">
  <div class="relink-content">
    <p class="description">
      Select a new document to associate this card with.
    </p>

    {#if isLoading}
      <p>Loading documents...</p>
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
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <footer class="modal-footer">
    <Button variant="secondary" onclick={() => onclose?.()}>Cancel</Button>
    <Button onclick={handleRelink} disabled={!selectedSchemaId}
      >Confirm Change</Button
    >
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
    border-radius: var(--radius-md);
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
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
  }
</style>
