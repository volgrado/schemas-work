<!--
  @component
  DeckOptionsModal

  A modal dialog for configuring the spaced repetition settings for a specific deck.
  It allows users to customize parameters like the maximum number of new cards and reviews per day,
  learning steps, and the graduating interval for new cards.

  The component fetches the current settings for the given `deckId` when it mounts,
  and saves any changes back to the `deckService`.

  Props:
  - `deckId`: {string} - The ID of the deck whose options are being edited.
  - `onclose`: {() => void} - A callback function invoked when the modal is closed.
-->
<script lang="ts">
  import { toast } from 'svelte-sonner';
  import type { DeckOptions } from '$lib/services/features/deckService';
  import * as deckService from '$lib/services/features/deckService';

  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';

  type Events = {
    close: () => void;
  };

  let {
    /**
     * @prop {string} deckId
     * The ID of the deck whose options are being edited.
     */
    deckId,
    /**
     * @prop {() => void} [onclose]
     * A callback function invoked when the modal is closed.
     */
    onclose,
  } = $props<{
    deckId: string;
    onclose?: Events['close'];
  }>();

  let options = $state<DeckOptions | null>(null);

  // When the deckId prop is valid, fetch the options for that deck.
  $effect(() => {
    if (deckId) {
      deckService.getDeckOptions(deckId).then((data) => {
        options = data;
      });
    } else {
      options = null;
    }
  });

  async function handleSave() {
    if (!options) return;
    try {
      await deckService.saveDeckOptions(options);
      toast.success('Deck options saved.');
      onclose?.();
    } catch (error) {
      toast.error('Failed to save options.');
      console.error(error);
    }
  }
</script>

{#if options}
  <Modal onClose={() => onclose?.()} title="Deck Options">
    <div class="options-form">
      <div class="form-field">
        <label for="maxNew">Max New Cards / Day</label>
        <Input
          id="maxNew"
          type="number"
          bind:value={options.maxNewCardsPerDay}
        />
      </div>
      <div class="form-field">
        <label for="maxReviews">Max Reviews / Day</label>
        <Input
          id="maxReviews"
          type="number"
          bind:value={options.maxReviewsPerDay}
        />
      </div>
      <div class="form-field">
        <label for="learningSteps">Learning Steps (e.g., "1m 10m 1d")</label>
        <Input
          id="learningSteps"
          type="text"
          bind:value={options.learningSteps}
        />
      </div>
      <div class="form-field">
        <label for="graduatingInterval">Graduating Interval (days)</label>
        <Input
          id="graduatingInterval"
          type="number"
          bind:value={options.graduatingInterval}
        />
      </div>
    </div>

    <footer class="modal-footer">
      <Button variant="secondary" onclick={() => onclose?.()}>Cancel</Button>
      <Button onclick={handleSave}>Save</Button>
    </footer>
  </Modal>
{/if}

<style>
  .options-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .form-field label {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-xl);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-md);
  }
</style>
