<script lang="ts">
  import {
    settingsState,
    selectModel,
  } from '$lib/stores/settingsStore.svelte';
  import {
    SUPPORTED_MODELS,
    type AiModel,
  } from '$lib/services/ai/aiModels';
  import Icon from '$lib/components/core/Icon.svelte';
  import Spinner from '$lib/components/core/Spinner.svelte';
  import { t } from '$lib/utils/i18n';
  import { fade } from 'svelte/transition';

  let { 
    isDiscoveringModels, 
    discoveredModelIds, 
    discoveredModels 
  } = $props<{
    isDiscoveringModels: boolean;
    discoveredModelIds: Set<string> | null;
    discoveredModels: AiModel[];
  }>();
</script>

<div class="tab-panel" in:fade={{ duration: 200 }}>
  <div class="info-box">
    <Icon name="info" size={18} class="text-accent" />
    <p class="explanation">{$t('apiKeyModal.explanation_models')}</p>
  </div>
  
  <div class="form-section">
    <label for="model-selector" class="section-label">
      {$t('apiKeyModal.model_selector_label')}
    </label>
    <div class="select-wrapper">
      <select
        id="model-selector"
        class="premium-select"
        value={settingsState.selectedModelId}
        onchange={(e) =>
          selectModel((e.target as HTMLSelectElement).value)}
        disabled={isDiscoveringModels || !discoveredModelIds}
      >
        <optgroup label={$t('apiKeyModal.optgroup.supported')}>
          {#each SUPPORTED_MODELS as model}
            {@const isAvailable = discoveredModelIds?.has(model.id)}
            <option
              value={model.id}
              disabled={discoveredModelIds !== null && !isAvailable}
            >
              {model.name}
              {#if discoveredModelIds !== null}
                ({isAvailable
                  ? $t('apiKeyModal.available')
                  : $t('apiKeyModal.unavailable')})
              {/if}
            </option>
          {/each}
        </optgroup>
        {#if discoveredModels.length > 0}
          <optgroup label={$t('apiKeyModal.optgroup.discovered')}>
            {#each discoveredModels as model}
              <option value={model.id}>{model.name} *</option>
            {/each}
          </optgroup>
        {/if}
      </select>
      <Icon name="chevron-down" size={16} class="select-arrow" />
      {#if isDiscoveringModels}
        <div class="spinner-wrapper">
          <Spinner size="sm" />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .tab-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .info-box {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-md);
    background-color: hsla(var(--color-accent-hsl) / 0.05);
    border: 1px solid hsla(var(--color-accent-hsl) / 0.1);
    border-radius: var(--radius-md);
    align-items: flex-start;
  }

  .explanation {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .section-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: var(--space-xs);
  }

  .select-wrapper {
    position: relative;
  }

  .premium-select {
    width: 100%;
    appearance: none;
    background-color: var(--color-background);
    border: 1px solid var(--color-border-input);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    padding-right: 40px;
    font-size: 1rem;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s;
  }

  .premium-select:hover {
    border-color: var(--color-gray-400);
  }

  .premium-select:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px hsla(var(--color-accent-hsl) / 0.15);
  }

  :global(.select-arrow) {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--color-text-secondary);
  }

  .spinner-wrapper {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
  }

  :global(.text-accent) {
    color: var(--color-accent);
  }
</style>
