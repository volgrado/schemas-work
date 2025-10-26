<!--
  @component
  QuickCardEditorModal

  A modal for quickly editing the contents of any type of flashcard. It provides a
  unified interface to modify a card's fields, tags, and suspended status.

  This component is used from the `CardBrowser` to allow for rapid, focused edits
  without needing to navigate to the source document.

  Props:
  - `card`: {Card} - The card object to be edited.
  - `onclose`: {() => void} - Callback fired when the modal is closed.
  - `onupdate`: {(card: Card) => void} - Callback fired when the card is successfully updated.
  - `ondelete`: {(cardId: string) => void} - Callback fired when the card is deleted.
  - `onchangeSource`: {(card: Card) => void} - Callback to initiate the source-changing workflow.
-->
<script lang="ts">
  import type { Card } from '$lib/types';
  import * as cardService from '$lib/services/features/cardService';
  import { toast } from 'svelte-sonner';

  // UI Components
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import TagInput from '$lib/components/ui/TagInput.svelte';

  type Events = {
    close: () => void;
    update: (card: Card) => void;
    delete: (cardId: string) => void;
    changeSource: (card: Card) => void;
  };

  let {
    /**
     * @prop {Card} card
     * The card object to be edited.
     */
    card,
    /**
     * @prop {() => void} [onclose]
     * Callback fired when the modal is closed.
     */
    onclose,
    /**
     * @prop {(card: Card) => void} [onupdate]
     * Callback fired when the card is successfully updated.
     */
    onupdate,
    /**
     * @prop {(cardId: string) => void} [ondelete]
     * Callback fired when the card is deleted.
     */
    ondelete,
    /**
     * @prop {(card: Card) => void} [onchangeSource]
     * Callback to initiate the source-changing workflow.
     */
    onchangeSource,
  } = $props<{
    card: Card;
    onclose?: Events['close'];
    onupdate?: Events['update'];
    ondelete?: Events['delete'];
    onchangeSource?: Events['changeSource'];
  }>();

  let editableCard = $state<Card>(JSON.parse(JSON.stringify(card)));

  async function saveCardChanges(cardToSave: Card) {
    try {
      await cardService.updateCard(cardToSave);
      toast.success('Card updated successfully.');
      onupdate?.(cardToSave);
    } catch (error) {
      toast.error('Failed to save card changes.');
      console.error(error);
    }
  }

  async function handleSaveAndClose() {
    await saveCardChanges(editableCard);
    onclose?.();
  }

  async function handleDelete() {
    if (confirm('Are you sure you want to permanently delete this card?')) {
      try {
        await cardService.deleteCard(card.id);
        toast.success('Card deleted.');
        ondelete?.(card.id);
        onclose?.();
      } catch (error) {
        toast.error('Failed to delete card.');
        console.error(error);
      }
    }
  }

  function openChangeSource() {
    // Let the parent component handle this event
    onchangeSource?.(card);
  }

  // Sequencing Card Helpers
  function addItem() {
    if (editableCard.type === 'sequencing') {
      editableCard.content.items.push('');
      editableCard.content.items = editableCard.content.items;
    }
  }
  function removeItem(index: number) {
    if (editableCard.type === 'sequencing') {
      editableCard.content.items.splice(index, 1);
      editableCard.content.items = editableCard.content.items;
    }
  }
</script>

<!-- The main edit modal -->
<Modal onClose={() => onclose?.()} title="Edit Card">
  <div class="card-editor-content">
    <!-- Card-specific fields -->
    {#if editableCard.type === 'basic'}
      {@const c = editableCard.content}
      <div class="field">
        <label for="question">Question</label>
        <Textarea id="question" bind:value={c.question} rows={3} />
      </div>
      <div class="field">
        <label for="answer">Answer</label>
        <Textarea id="answer" bind:value={c.answer} rows={3} />
      </div>
    {:else if editableCard.type === 'input'}
      {@const c = editableCard.content}
      <div class="field">
        <label for="prompt">Prompt (use {'{{...}}'} for the blank)</label>
        <Textarea id="prompt" bind:value={c.prompt} rows={3} />
      </div>
      <div class="field">
        <label for="expected">Expected Answer</label>
        <Input id="expected" bind:value={c.expected} />
      </div>
    {:else if editableCard.type === 'sequencing'}
      {@const c = editableCard.content}
      <div class="field">
        <label for="prompt-seq">Instruction</label>
        <Textarea id="prompt-seq" bind:value={c.prompt} rows={2} />
      </div>
      <div class="group-label">Sequence Items (in correct order)</div>
      <div class="sequence-items-list">
        {#each c.items as item, i}
          <div class="sequence-item">
            <span class="item-number">{i + 1}.</span>
            <Input bind:value={c.items[i]} placeholder={`Item ${i + 1}`} />
            <Button
              onclick={() => removeItem(i)}
              variant="ghost"
              size="sm"
              aria-label="Remove item"
            >
              <Icon name="x" size={16} />
            </Button>
          </div>
        {/each}
      </div>
      <Button
        onclick={addItem}
        variant="secondary"
        size="sm"
        class="add-item-btn"
      >
        <Icon name="plus" size={14} /> Add Item
      </Button>
    {/if}

    <!-- Tag Input Field -->
    <div class="field">
      <label for="tags">Tags</label>
      <TagInput id="tags" tags={editableCard.tags} />
    </div>
  </div>

  <div class="card-actions-footer">
    <div class="suspend-toggle">
      <label for="suspend">Suspend Card</label>
      <Toggle id="suspend" bind:checked={editableCard.suspended} />
    </div>
    <div class="footer-buttons">
      <div class="left-actions">
        <Button onclick={openChangeSource} variant="secondary" size="sm">
          <Icon name="git-branch" size={14} /> Change Source
        </Button>
        <Button
          onclick={handleDelete}
          variant="secondary"
          class="destructive-btn">Delete</Button
        >
      </div>
      <div class="right-actions">
        <Button onclick={() => onclose?.()} variant="secondary">Cancel</Button>
        <Button onclick={handleSaveAndClose}>Save Changes</Button>
      </div>
    </div>
  </div>
</Modal>

<style>
  .card-editor-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }
  .card-editor-content label,
  .group-label {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }
  .sequence-items-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .sequence-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .item-number {
    color: var(--color-text-secondary);
  }
  .sequence-item :global(input) {
    flex-grow: 1;
  }
  .add-item-btn {
    align-self: flex-start;
  }
  .card-actions-footer {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-md);
  }
  .suspend-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-xs);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }
  .suspend-toggle label {
    font-weight: 500;
    font-size: 0.9rem;
  }
  .footer-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .left-actions,
  .right-actions {
    display: flex;
    gap: var(--space-sm);
  }
  .destructive-btn {
    color: var(--color-red-500);
  }
  .destructive-btn:hover {
    background-color: var(--color-red-50);
    color: var(--color-red-600);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
</style>
