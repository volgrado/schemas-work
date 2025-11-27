<!-- src/lib/components/ui/command-bar/DeckOptionsView.svelte -->
<script lang="ts">
  import { i18n } from '$lib/utils/i18n.svelte';
  import { toast } from 'svelte-sonner';
  import type { DeckOptions } from '$lib/modules/study/domain/deckService';
  import * as deckService from '$lib/modules/study/domain/deckService';
  import { fileSystemStore } from '@modules/file-system';
  import { goBack } from '$lib/modules/command-bar/ui/commandBarStore.svelte';

  // --- UI Component Imports ---
  import Icon from '@ui/Icon.svelte';
  import Spinner from '@ui/Spinner.svelte';
  import Button from '@ui/Button.svelte';
  import Input from '@ui/Input.svelte';
  import ViewHeader from './ViewHeader.svelte';
  import CommandButton from './CommandButton.svelte';

  const { deckId } = $props<{ deckId: string }>();

  let options = $state<DeckOptions | null>(null);
  let deckName = $state<string>('');
  let isSaving = $state(false);

  $effect(() => {
    if (deckId) {
      // Set state to null to ensure skeleton shows on navigation
      options = null;
      deckName = '';

      Promise.all([
        deckService.getDeckOptions(deckId),
        // fileSystemStore is synchronous now, but we can wrap it or just call it.
        // Since we are in a Promise.all, we can just resolve it.
        Promise.resolve(fileSystemStore.getItem(deckId)),
      ]).then(([optionsData, metadata]) => {
        options = optionsData;
        deckName = metadata?.title || '';
      });
    }
  });

  async function handleSave() {
    if (!options || isSaving) return;
    isSaving = true;
    try {
      await deckService.saveDeckOptions(options);
      toast.success(i18n.t('deckOptions.saveSuccess'));
      goBack();
    } catch (error) {
      toast.error(i18n.t('deckOptions.saveFailed'));
      console.error(error);
    } finally {
      isSaving = false;
    }
  }
</script>

<!-- The entire template and style sections are correct. No changes are needed there. -->

<div class="view-container">
  <ViewHeader title={deckName || i18n.t('deckOptions.title')} onBack={goBack}>
    <Button size="sm" onclick={handleSave} disabled={isSaving || !options}>
      {#if isSaving}
        <Spinner size="sm" />
      {:else}
        <Icon name="check" size={14} />
      {/if}
      {i18n.t('deckOptions.save')}
    </Button>
  </ViewHeader>

  <div class="content-area">
    {#if !options}
      <div class="options-form">
        {#each { length: 4 } as _, i (i)}
          <div class="form-field">
            <div class="skeleton label-skeleton"></div>
            <div class="skeleton input-skeleton"></div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="options-form">
        <div class="form-field">
          <label for="maxNew">{i18n.t('deckOptions.maxNew')}</label>
          <Input
            id="maxNew"
            type="number"
            bind:value={options.maxNewCardsPerDay}
          />
        </div>
        <div class="form-field">
          <label for="maxReviews">{i18n.t('deckOptions.maxReviews')}</label>
          <Input
            id="maxReviews"
            type="number"
            bind:value={options.maxReviewsPerDay}
          />
        </div>
        <div class="form-field">
          <label for="learningSteps">{i18n.t('deckOptions.learningSteps')}</label>
          <Input
            id="learningSteps"
            type="text"
            bind:value={options.learningSteps}
          />
        </div>
        <div class="form-field">
          <label for="graduatingInterval"
            >{i18n.t('deckOptions.graduatingInterval')}</label
          >
          <Input
            id="graduatingInterval"
            type="number"
            bind:value={options.graduatingInterval}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* All styles are unchanged and correct */
  .view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .content-area {
    overflow-y: auto;
    padding: var(--space-sm);
  }
  :global(.back-button) {
    width: auto !important;
    padding: 8px !important;
  }
  .options-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-xs);
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

  .skeleton {
    background-color: var(--color-gray-100);
    border-radius: var(--border-radius-sm);
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.6;
    }
  }
  .label-skeleton {
    height: 14px;
    width: 120px;
    margin-bottom: 2px;
  }
  .input-skeleton {
    height: 40px;
    width: 100%;
  }

  :global(.dark-theme) .skeleton {
    background-color: var(--color-gray-800);
  }
</style>
