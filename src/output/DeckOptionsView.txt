<!--
  @component
  DeckOptionsView

  A view within the command bar for configuring a specific deck's review settings.
-->
<script lang="ts">
  import { t } from '$lib/utils/i18n';
  import { toast } from 'svelte-sonner';
  import type { DeckOptions } from '$lib/services/features/deckService';
  import * as deckService from '$lib/services/features/deckService';
  import { commandBarStore } from '$lib/stores/commandBarStore';

  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';

  const { deckId } = $props<{ deckId: string }>();

  let options = $state<DeckOptions | null>(null);

  $effect(() => {
    if (deckId) {
      deckService.getDeckOptions(deckId).then((data) => {
        options = data;
      });
    }
  });

  async function handleSave() {
    if (!options) return;
    try {
      await deckService.saveDeckOptions(options);
      toast.success($t('deckOptions.saveSuccess'));
      commandBarStore.setView('study-hub'); // Go back to the deck list
    } catch (error) {
      toast.error($t('deckOptions.saveFailed'));
      console.error(error);
    }
  }
</script>

<nav class="action-list options-view" aria-labelledby="deck-options-title">
  <h2 id="deck-options-title" class="visually-hidden">
    {$t('deckOptions.title')}
  </h2>

  {#if options}
    <div class="options-form">
      <div class="form-field">
        <label for="maxNew">{$t('deckOptions.maxNew')}</label>
        <Input
          id="maxNew"
          type="number"
          bind:value={options.maxNewCardsPerDay}
        />
      </div>
      <div class="form-field">
        <label for="maxReviews">{$t('deckOptions.maxReviews')}</label>
        <Input
          id="maxReviews"
          type="number"
          bind:value={options.maxReviewsPerDay}
        />
      </div>
      <div class="form-field">
        <label for="learningSteps">{$t('deckOptions.learningSteps')}</label>
        <Input
          id="learningSteps"
          type="text"
          bind:value={options.learningSteps}
        />
      </div>
      <div class="form-field">
        <label for="graduatingInterval"
          >{$t('deckOptions.graduatingInterval')}</label
        >
        <Input
          id="graduatingInterval"
          type="number"
          bind:value={options.graduatingInterval}
        />
      </div>
      <div class="form-actions">
        <Button
          variant="secondary"
          onclick={() => commandBarStore.setView('study-hub')}
          >{$t('deckOptions.cancel')}</Button
        >
        <Button onclick={handleSave}>{$t('deckOptions.saveAndClose')}</Button>
      </div>
    </div>
  {:else}
    <div class="loading-state">{$t('deckOptions.loading')}</div>
  {/if}
</nav>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
  .options-view {
    padding: var(--space-sm);
  }
  .options-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
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
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
    border-top: 1px solid var(--panel-border-light);
    padding-top: var(--space-md);
  }
  .loading-state {
    text-align: center;
    padding: var(--space-xl);
    color: var(--color-text-secondary);
  }

  :global(.dark-theme) .form-actions {
    border-color: var(--panel-border-dark);
  }
</style>
