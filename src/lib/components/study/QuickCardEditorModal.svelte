<!-- src/lib/components/study/QuickCardEditorModal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  // FIX: Import the SRS namespace and create a local alias for the Card type.
  import type { SRS } from '$lib/types';
  type Card = SRS.Card;
  import * as cardService from '$lib/services/features/cardService';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/utils/i18n';

  // UI Components
  import Modal from '$lib/components/core/Modal.svelte';
  import Button from '$lib/components/core/Button.svelte';
  import Input from '$lib/components/core/Input.svelte';
  import Textarea from '$lib/components/core/Textarea.svelte';
  import Toggle from '$lib/components/core/Toggle.svelte';
  import Icon from '$lib/components/core/Icon.svelte';
  import TagInput from '$lib/components/core/TagInput.svelte';

  let { show = $bindable(false), card } = $props<{
    show?: boolean;
    card: Card;
  }>();

  const dispatch = createEventDispatcher<{
    close: void;
    update: Card;
    delete: string;
    changeSource: Card;
  }>();

  let editableCard = $state<Card | null>(null);

  $effect(() => {
    if (show) {
      // Deep clone the card to prevent mutating the original prop
      editableCard = JSON.parse(JSON.stringify(card));
    }
  });

  const hasUnsavedChanges = $derived(
    editableCard ? JSON.stringify(editableCard) !== JSON.stringify(card) : false
  );

  function requestClose() {
    // FIX: Access the derived value directly.
    if (hasUnsavedChanges) {
      if (confirm($t('quickCardEditor.unsavedChangesConfirm'))) {
        dispatch('close');
      }
    } else {
      dispatch('close');
    }
  }

  async function handleSaveAndClose() {
    if (!editableCard) return;
    try {
      await cardService.updateCard(editableCard);
      toast.success($t('quickCardEditor.updateSuccess'));
      dispatch('update', editableCard);
      dispatch('close');
    } catch (error) {
      toast.error($t('quickCardEditor.updateFailed'));
      console.error(error);
    }
  }

  async function handleDelete() {
    if (confirm($t('quickCardEditor.deleteConfirm'))) {
      try {
        await cardService.deleteCard(card.id);
        toast.success($t('quickCardEditor.deleteSuccess'));
        dispatch('delete', card.id);
        dispatch('close');
      } catch (error) {
        toast.error($t('quickCardEditor.deleteFailed'));
        console.error(error);
      }
    }
  }
</script>

<Modal bind:show title={$t('quickCardEditor.title')} onClose={requestClose}>
  {#if editableCard}
    <div class="card-editor-content">
      {#if editableCard.type === 'basic'}
        {@const c = editableCard.content}
        <div class="field">
          <label for="question">{$t('quickCardEditor.questionLabel')}</label
          ><Textarea id="question" bind:value={c.question} rows={3} />
        </div>
        <div class="field">
          <label for="answer">{$t('quickCardEditor.answerLabel')}</label
          ><Textarea id="answer" bind:value={c.answer} rows={3} />
        </div>
      {:else if editableCard.type === 'input'}
        {@const c = editableCard.content}
        <div class="field">
          <label for="prompt">{$t('quickCardEditor.promptLabel')}</label
          ><Textarea id="prompt" bind:value={c.prompt} rows={3} />
        </div>
        <div class="field">
          <label for="expected">{$t('quickCardEditor.expectedLabel')}</label
          ><Input id="expected" bind:value={c.expected} />
        </div>
      {:else if editableCard.type === 'sequencing'}
        {@const c = editableCard.content}
        <div class="field">
          <label for="prompt-seq"
            >{$t('quickCardEditor.instructionLabel')}</label
          ><Textarea id="prompt-seq" bind:value={c.prompt} rows={2} />
        </div>
        <div class="group-label">
          {$t('quickCardEditor.sequenceGroupLabel')}
        </div>
        <div class="sequence-items-list">
          {#each c.items as item, i (i)}
            <div class="sequence-item">
              <span class="item-number">{i + 1}.</span>
              <Input
                bind:value={c.items[i]}
                placeholder={$t('quickCardEditor.sequenceItemPlaceholder', {
                  i: i + 1,
                })}
              />
              <Button
                onclick={() =>
                  (c.items = c.items.filter(
                    // FIX: Add explicit types for the filter callback parameters.
                    (_: string, idx: number) => idx !== i
                  ))}
                variant="ghost"
                size="sm"
                aria-label={$t('quickCardEditor.removeItemAria')}
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
          {$t('quickCardEditor.addItem')}
        </Button>
      {/if}
      <div class="field">
        <label for="tags">{$t('quickCardEditor.tagsLabel')}</label>
        <TagInput id="tags" bind:tags={editableCard.tags} />
      </div>
    </div>
    <div class="card-actions-footer">
      <div class="suspend-toggle">
        <label for="suspend">{$t('quickCardEditor.suspendLabel')}</label>
        <Toggle id="suspend" bind:checked={editableCard.suspended} />
      </div>
      <div class="footer-buttons">
        <div class="left-actions">
          <Button
            onclick={() => dispatch('changeSource', card)}
            variant="secondary"
            size="sm"
          >
            <Icon name="git-branch" size={14} />
            {$t('quickCardEditor.changeSource')}
          </Button>
          <Button
            onclick={handleDelete}
            variant="secondary"
            class="destructive-btn"
          >
            {$t('quickCardEditor.delete')}
          </Button>
        </div>
        <div class="right-actions">
          <Button onclick={requestClose} variant="secondary"
            >{$t('quickCardEditor.cancel')}</Button
          >
          <!-- FIX: Access the derived value directly. -->
          <Button onclick={handleSaveAndClose} disabled={!hasUnsavedChanges}>
            {$t('quickCardEditor.save')}
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
  /* FIX: Use `:global()` to target the class on the child Button component. */
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
  /* FIX: Use `:global()` to target the class on the child Button component. */
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
  /* Removed redundant dark theme overrides */
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
