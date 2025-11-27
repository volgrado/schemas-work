<!--
  @component
  QuickCardEditorModal

  @description
  A powerful modal for editing existing flashcards during a review or study session.
  It supports all card types (Basic, Input, Sequencing) and allows for quick modifications
  without leaving the current context.

  Features:
  - **Context Retention:** Clones the card data to allow safe editing without mutating the source prematurely.
  - **Dirty Checking:** Detects unsaved changes and warns the user before closing.
  - **CRUD Actions:** Update content, delete card, or move card (change source).
  - **Suspension:** Toggle card suspension status directly.

  @props
  - `show` (bindable boolean): Visibility control.
  - `card` (Card): The card to edit.
  - `onClose` (function): Close callback.
  - `onUpdate` (function): Success callback for updates.
  - `onDelete` (function): Success callback for deletion.
  - `onChangeSource` (function): Callback to trigger the Relink flow.
-->
<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import type { SRS } from '$lib/types';
  import * as cardService from '$lib/modules/study/domain/cardService';
  import { toast } from 'svelte-sonner';

  // --- UI Components ---
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Input from '$lib/core/ui/Input.svelte';
  import Textarea from '$lib/core/ui/Textarea.svelte';
  import Toggle from '$lib/core/ui/Toggle.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import TagInput from '$lib/core/ui/TagInput.svelte';

  type Card = SRS.Card;

  let {
    show = $bindable(false),
    card,
    onClose,
    onUpdate,
    onDelete,
    onChangeSource,
  } = $props<{
    show?: boolean;
    card: Card;
    onClose?: () => void;
    onUpdate?: (card: Card) => void;
    onDelete?: (id: string) => void;
    onChangeSource?: (card: Card) => void;
  }>();

  // --- State ---
  let editableCard = $state<Card | null>(null);

  // --- Effects ---
  $effect(() => {
    if (show) {
      // Deep clone the card to create a detached editing buffer
      editableCard = JSON.parse(JSON.stringify(card));
    }
  });

  // Derived: Check if the buffer differs from the original prop
  const hasUnsavedChanges = $derived(
    editableCard ? JSON.stringify(editableCard) !== JSON.stringify(card) : false
  );

  // --- Actions ---

  function requestClose() {
    if (hasUnsavedChanges) {
      if (confirm(i18n.t('quickCardEditor.unsavedChangesConfirm'))) {
        onClose?.();
      }
    } else {
      onClose?.();
    }
  }

  async function handleSaveAndClose() {
    if (!editableCard) return;
    try {
      await cardService.updateCard(editableCard);
      toast.success(i18n.t('quickCardEditor.updateSuccess'));
      onUpdate?.(editableCard);
      onClose?.();
    } catch (error) {
      toast.error(i18n.t('quickCardEditor.updateFailed'));
      console.error(error);
    }
  }

  async function handleDelete() {
    if (confirm(i18n.t('quickCardEditor.deleteConfirm'))) {
      try {
        await cardService.deleteCard(card.id);
        toast.success(i18n.t('quickCardEditor.deleteSuccess'));
        onDelete?.(card.id);
        onClose?.();
      } catch (error) {
        toast.error(i18n.t('quickCardEditor.deleteFailed'));
        console.error(error);
      }
    }
  }
</script>

<Modal bind:show title={i18n.t('quickCardEditor.title')} onClose={requestClose}>
  {#if editableCard}
    <div class="card-editor-content">
      <!-- Polymorphic Editor Fields based on Card Type -->
      {#if editableCard.type === 'basic'}
        {@const c = editableCard.content}
        <div class="field">
          <label for="question">{i18n.t('quickCardEditor.questionLabel')}</label
          ><Textarea id="question" bind:value={c.question} rows={3} />
        </div>
        <div class="field">
          <label for="answer">{i18n.t('quickCardEditor.answerLabel')}</label
          ><Textarea id="answer" bind:value={c.answer} rows={3} />
        </div>
      {:else if editableCard.type === 'input'}
        {@const c = editableCard.content}
        <div class="field">
          <label for="prompt">{i18n.t('quickCardEditor.promptLabel')}</label
          ><Textarea id="prompt" bind:value={c.prompt} rows={3} />
        </div>
        <div class="field">
          <label for="expected">{i18n.t('quickCardEditor.expectedLabel')}</label
          ><Input id="expected" bind:value={c.expected} />
        </div>
      {:else if editableCard.type === 'sequencing'}
        {@const c = editableCard.content}
        <div class="field">
          <label for="prompt-seq"
            >{i18n.t('quickCardEditor.instructionLabel')}</label
          ><Textarea id="prompt-seq" bind:value={c.prompt} rows={2} />
        </div>

        <div class="group-label">
          {i18n.t('quickCardEditor.sequenceGroupLabel')}
        </div>

        <div class="sequence-items-list">
          {#each c.items as item, i (i)}
            <div class="sequence-item">
              <span class="item-number">{i + 1}.</span>
              <Input
                bind:value={c.items[i]}
                placeholder={i18n.t('quickCardEditor.sequenceItemPlaceholder', {
                  i: i + 1,
                })}
              />
              <Button
                onclick={() =>
                  (c.items = c.items.filter(
                    (_: string, idx: number) => idx !== i
                  ))}
                variant="ghost"
                size="sm"
                aria-label={i18n.t('quickCardEditor.removeItemAria')}
              >
                <Icon name="x" size={16} />
              </Button>
            </div>
          {/each}
        </div>
        <Button
          onclick={() => (c.items = [...c.items, ''])}
          variant="secondary"
          size="sm"
          class="add-item-btn"
        >
          <Icon name="plus" size={14} />
          {i18n.t('quickCardEditor.addItem')}
        </Button>
      {/if}

      <!-- Shared Fields -->
      <div class="field">
        <label for="tags">{i18n.t('quickCardEditor.tagsLabel')}</label>
        <TagInput id="tags" bind:tags={editableCard.tags} />
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="card-actions-footer">
      <div class="suspend-toggle">
        <label for="suspend">{i18n.t('quickCardEditor.suspendLabel')}</label>
        <Toggle id="suspend" bind:checked={editableCard.suspended} />
      </div>

      <div class="footer-buttons">
        <div class="left-actions">
          <Button
            onclick={() => onChangeSource?.(card)}
            variant="secondary"
            size="sm"
          >
            <Icon name="git-branch" size={14} />
            {i18n.t('quickCardEditor.changeSource')}
          </Button>
          <Button
            onclick={handleDelete}
            variant="secondary"
            class="destructive-btn"
          >
            {i18n.t('quickCardEditor.delete')}
          </Button>
        </div>
        <div class="right-actions">
          <Button onclick={requestClose} variant="secondary"
            >{i18n.t('quickCardEditor.cancel')}</Button
          >
          <Button onclick={handleSaveAndClose} disabled={!hasUnsavedChanges}>
            {i18n.t('quickCardEditor.save')}
          </Button>
        </div>
      </div>
    </div>
  {/if}
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
  :global(.add-item-btn) {
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
    background-color: var(--color-gray-50);
    border-radius: var(--border-radius-md);
  }
  .suspend-toggle label {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--color-text);
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
  :global(.destructive-btn) {
    color: var(--color-danger);
  }
  :global(.destructive-btn:hover) {
    background-color: var(--color-danger-bg);
    border-color: var(--color-danger-border);
    color: var(--color-danger-text);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  /* Theme Overrides */
  :global(.dark-theme) .suspend-toggle {
    background-color: var(--color-gray-800);
  }
  :global(.dark-theme) .suspend-toggle label {
    color: var(--color-text-dark);
  }
  :global(.dark-theme .destructive-btn:hover) {
    background-color: hsl(var(--color-danger-hsl) / 0.1);
    border-color: hsl(var(--color-danger-hsl) / 0.2);
  }
</style>
