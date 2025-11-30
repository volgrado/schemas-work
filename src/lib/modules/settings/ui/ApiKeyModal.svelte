<!--
  @component
  ApiKeyModal

  @description
  The central configuration hub for AI settings.
  It manages:
  - **Model Selection:** Choosing between official models (e.g., Gemini Pro) and dynamically discovered ones.
  - **API Key Management:** Adding, removing, and validating provider keys.
  - **Discovery:** Automatically testing keys to find available models via `modelDiscoveryService`.

  Structure:
  - Uses a tabbed interface ('Models' vs. 'Keys') to separate concerns.
  - Delegates the content of each tab to sub-components (`ApiKeyModelsTab`, `ApiKeyKeysTab`).

  @props
  - `show` (boolean): Visibility control.
  - `onClose` (function): Close callback.
-->
<script lang="ts">
  import {
    settingsState,
    type ApiKey,
  } from '$lib/modules/settings/ui/settingsStore.svelte';
  import {
    SUPPORTED_MODELS,
    createDiscoveredModel,
    type AiModel,
  } from '$lib/modules/ai/aiModels';
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fetchAvailableGeminiModels } from '$lib/modules/ai/modelDiscoveryService';
  import { i18n } from '$lib/utils/i18n.svelte';
  import { open as openCommandBar } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import { fade } from 'svelte/transition';

  // --- Sub-components ---
  import ApiKeyModelsTab from './api-key-modal/ApiKeyModelsTab.svelte';
  import ApiKeyKeysTab from './api-key-modal/ApiKeyKeysTab.svelte';


  const { show = false, onClose, initialTab = 'models' } = $props<{
    show?: boolean;
    onClose: () => void;
    initialTab?: 'models' | 'keys';
  }>();

  // --- State ---
  let activeTab = $state<'models' | 'keys'>(initialTab);
  let isDiscoveringModels = $state(false);
  let discoveredModelIds = $state<Set<string> | null>(null);
  let discoveredModels = $state<AiModel[]>([]);

  // --- Logic ---

  /**
   * Fetches available models from the provider using the given API key.
   * Updates the local list of "discovered" (non-standard) models.
   */
  async function discoverModels(apiKey: string): Promise<boolean> {
    isDiscoveringModels = true;
    try {
      const liveIds = await fetchAvailableGeminiModels(apiKey);
      discoveredModelIds = liveIds;

      const knownModelIds = new Set(SUPPORTED_MODELS.map((m) => m.id));

      // Filter out models we already know about
      discoveredModels = Array.from(liveIds)
        .filter((id) => !knownModelIds.has(id))
        .map(createDiscoveredModel);

      return true;
    } catch (error) {
      toast.error(i18n.t('apiKeyModal.toast.invalid_key_error'));
      discoveredModelIds = new Set();
      return false;
    } finally {
      isDiscoveringModels = false;
    }
  }

  // Effect: Trigger discovery when modal opens if a key exists
  $effect(() => {
    if (show) {
      const geminiKey = settingsState.apiKeys.find(
        (k: ApiKey) => k.provider === 'gemini'
      );
      if (geminiKey && !discoveredModelIds) {
        discoverModels(geminiKey.key);
      }
    } else {
      // Reset state on close
      activeTab = initialTab;
      discoveredModelIds = null;
      discoveredModels = [];
    }
  });

  function handleBack() {
    onClose();
    openCommandBar();
  }
</script>

<Modal title="AI Settings" {show} {onClose} onBack={handleBack}>
  <div class="ai-settings-content">
    <!-- Navigation Tabs -->
    <div class="tabs-container">
      <div class="tabs" role="tablist">
        <button
          class="tab-button"
          class:active={activeTab === 'models'}
          onclick={() => (activeTab = 'models')}
          role="tab"
          aria-selected={activeTab === 'models'}
        >
          <Icon name="sparkles" size={16} />
          <span>{i18n.t('apiKeyModal.tabs.models')}</span>
          {#if activeTab === 'models'}
            <div
              class="active-indicator"
              transition:fade={{ duration: 200 }}
            ></div>
          {/if}
        </button>
        <button
          class="tab-button"
          class:active={activeTab === 'keys'}
          onclick={() => (activeTab = 'keys')}
          role="tab"
          aria-selected={activeTab === 'keys'}
        >
          <Icon name="key" size={16} />
          <span>{i18n.t('apiKeyModal.tabs.keys')}</span>
          {#if activeTab === 'keys'}
            <div
              class="active-indicator"
              transition:fade={{ duration: 200 }}
            ></div>
          {/if}
        </button>

      </div>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'models'}
      <ApiKeyModelsTab
        {isDiscoveringModels}
        {discoveredModelIds}
        {discoveredModels}
      />
    {/if}

    {#if activeTab === 'keys'}
      <ApiKeyKeysTab {isDiscoveringModels} {discoverModels} />
    {/if}



    <!-- Footer -->
    <div class="modal-actions">
      <Button onclick={onClose} variant="ghost">{i18n.t('common.close')}</Button
      >
    </div>
  </div>
</Modal>

<style>
  .ai-settings-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  /* Tabs Styling */
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
