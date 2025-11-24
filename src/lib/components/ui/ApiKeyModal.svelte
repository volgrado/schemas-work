<!-- src/lib/components/ui/ApiKeyModal.svelte -->
<script lang="ts">
  import {
    settingsState,
    type ApiKey,
  } from '$lib/stores/settingsStore.svelte';
  import {
    SUPPORTED_MODELS,
    createDiscoveredModel,
    type AiModel,
  } from '$lib/services/ai/aiModels';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fetchAvailableGeminiModels } from '$lib/services/ai/modelDiscoveryService';
  import { t } from '$lib/utils/i18n';
  import { open as openCommandBar } from '$lib/stores/commandBarStore.svelte';
  import { fade } from 'svelte/transition';

  // Sub-components
  import ApiKeyModelsTab from './api-key-modal/ApiKeyModelsTab.svelte';
  import ApiKeyKeysTab from './api-key-modal/ApiKeyKeysTab.svelte';

  let { show = false, onClose } = $props<{
    show?: boolean;
    onClose: () => void;
  }>();

  let activeTab = $state<'models' | 'keys'>('models');
  let isDiscoveringModels = $state(false);
  let discoveredModelIds = $state<Set<string> | null>(null);
  let discoveredModels = $state<AiModel[]>([]);

  async function discoverModels(apiKey: string): Promise<boolean> {
    isDiscoveringModels = true;
    try {
      const liveIds = await fetchAvailableGeminiModels(apiKey);
      discoveredModelIds = liveIds;
      const knownModelIds = new Set(SUPPORTED_MODELS.map((m) => m.id));
      discoveredModels = Array.from(liveIds)
        .filter((id) => !knownModelIds.has(id))
        .map(createDiscoveredModel);
      return true;
    } catch (error) {
      toast.error($t('apiKeyModal.toast.invalid_key_error'));
      discoveredModelIds = new Set();
      return false;
    } finally {
      isDiscoveringModels = false;
    }
  }

  $effect(() => {
    if (show) {
      const geminiKey = settingsState.apiKeys.find(
        (k: ApiKey) => k.provider === 'gemini'
      );
      if (geminiKey && !discoveredModelIds) {
        discoverModels(geminiKey.key);
      }
    } else {
      activeTab = 'models';
      discoveredModelIds = null;
      discoveredModels = [];
    }
  });

  function handleBack() {
    onClose();
    openCommandBar();
  }
</script>

<Modal title={$t('apiKeyModal.title')} {show} {onClose} onBack={handleBack}>
  <div class="ai-settings-content">
    <!-- Premium Tabs -->
    <div class="tabs-container">
      <div class="tabs">
        <button
          class="tab-button"
          class:active={activeTab === 'models'}
          onclick={() => (activeTab = 'models')}
        >
          <Icon name="sparkles" size={16} />
          <span>{$t('apiKeyModal.tabs.models')}</span>
          {#if activeTab === 'models'}
            <div class="active-indicator" transition:fade={{ duration: 200 }}></div>
          {/if}
        </button>
        <button
          class="tab-button"
          class:active={activeTab === 'keys'}
          onclick={() => (activeTab = 'keys')}
        >
          <Icon name="key" size={16} />
          <span>{$t('apiKeyModal.tabs.keys')}</span>
          {#if activeTab === 'keys'}
            <div class="active-indicator" transition:fade={{ duration: 200 }}></div>
          {/if}
        </button>
      </div>
    </div>

    {#if activeTab === 'models'}
      <ApiKeyModelsTab 
        {isDiscoveringModels}
        {discoveredModelIds}
        {discoveredModels}
      />
    {/if}

    {#if activeTab === 'keys'}
      <ApiKeyKeysTab 
        {isDiscoveringModels}
        {discoverModels}
      />
    {/if}

    <div class="modal-actions">
      <Button onclick={onClose} variant="ghost">{$t('common.close')}</Button>
    </div>
  </div>
</Modal>

<style>
  .ai-settings-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  /* --- Tabs --- */
  .tabs-container {
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-xs);
  }

  .tabs {
    display: flex;
    gap: var(--space-lg);
  }

  .tab-button {
    position: relative;
    padding: var(--space-sm) 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    transition: color 0.2s ease;
  }

  .tab-button:hover {
    color: var(--color-text);
  }

  .tab-button.active {
    color: var(--color-accent);
  }

  .active-indicator {
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: var(--color-accent);
    border-radius: 2px 2px 0 0;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }
</style>

