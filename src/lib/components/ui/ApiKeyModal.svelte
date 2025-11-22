<!-- src/lib/components/ui/ApiKeyModal.svelte -->
<script lang="ts">
  import {
    settingsState,
    addApiKey,
    removeApiKey,
    selectModel,
    type ApiKey,
  } from '$lib/stores/settingsStore.svelte';
  import {
    SUPPORTED_MODELS,
    createDiscoveredModel,
    getModelById,
    type AiModel,
  } from '$lib/services/ai/aiModels';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Spinner from '$lib/components/ui/Spinner.svelte';
  import { toast } from 'svelte-sonner';
  import { fetchAvailableGeminiModels } from '$lib/services/ai/modelDiscoveryService';
  import { t } from '$lib/utils/i18n';
  import { open as openCommandBar } from '$lib/stores/commandBarStore.svelte';
  import { fade, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  let { show = false, onClose } = $props<{
    show?: boolean;
    onClose: () => void;
  }>();

  let newApiKey = $state('');
  let newApiNickname = $state('');
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

  async function handleAddKey(event: SubmitEvent) {
    event.preventDefault();
    const keyToAdd = newApiKey.trim();
    if (!keyToAdd) {
      toast.error($t('apiKeyModal.toast.empty_key_error'));
      return;
    }
    const isValid = await discoverModels(keyToAdd);
    if (isValid) {
      addApiKey(keyToAdd, 'gemini', newApiNickname.trim());
      toast.success($t('apiKeyModal.toast.key_added_success'));
      newApiKey = '';
      newApiNickname = '';
    }
  }

  function handleRemoveKey(key: ApiKey) {
    if (
      confirm(
        $t('apiKeyModal.confirm.remove_key', { name: key.nickname || key.id })
      )
    ) {
      removeApiKey(key.id);
      toast.info($t('apiKeyModal.toast.key_removed_info'));
      if (!settingsState.apiKeys.some((k: ApiKey) => k.provider === 'gemini')) {
        discoveredModelIds = null;
      }
    }
  }

  function truncateKey(key: string): string {
    if (key.length < 12) return key;
    return `${key.slice(0, 5)}...${key.slice(-4)}`;
  }

  function getUsagePercentage(key: ApiKey): {
    rpm: number;
    rpd: number;
    level: 'normal' | 'high' | 'critical';
  } {
    const model = getModelById(settingsState.selectedModelId);
    if (!model || key.provider !== model.provider) {
      return { rpm: 0, rpd: 0, level: 'normal' };
    }
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const requestsInLastMinute = key.requests.filter(
      (r) => r.timestamp > oneMinuteAgo
    ).length;
    const requestsInLastDay = key.requests.filter(
      (r) => r.timestamp > oneDayAgo
    ).length;
    const rpmPercentage =
      model.rpm > 0 ? (requestsInLastMinute / model.rpm) * 100 : 0;
    const rpdPercentage =
      model.rpd > 0 ? (requestsInLastDay / model.rpd) * 100 : 0;
    const maxUsage = Math.max(rpmPercentage, rpdPercentage);
    const level =
      maxUsage > 90 ? 'critical' : maxUsage > 70 ? 'high' : 'normal';

    return {
      rpm: Math.min(rpmPercentage, 100),
      rpd: Math.min(rpdPercentage, 100),
      level,
    };
  }
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
    {/if}

    {#if activeTab === 'keys'}
      <div class="tab-panel" in:fade={{ duration: 200 }}>
        <div class="info-box">
           <Icon name="shield" size={18} class="text-accent" />
           <p class="explanation">{$t('apiKeyModal.explanation_keys')}</p>
        </div>

        <div class="form-section">
          <h3 class="section-title">{$t('apiKeyModal.your_keys_header')}</h3>
          <ul class="key-list">
            {#if settingsState.apiKeys.length === 0}
              <div class="empty-state-keys">
                <Icon name="key" size={24} class="text-muted mb-2" />
                <p>{$t('apiKeyModal.empty_state')}</p>
              </div>
            {:else}
              {#each settingsState.apiKeys as key (key.id)}
                {@const usage = getUsagePercentage(key)}
                <li class="key-item" transition:slide={{ duration: 200, axis: 'y' }}>
                  <div class="key-icon">
                    <Icon name="key" size={18} />
                  </div>
                  <div class="key-info">
                    <div class="key-header">
                      <span class="key-nickname"
                        >{key.nickname || $t('apiKeyModal.untitled_key')}</span
                      >
                      <span class="key-provider-badge">{key.provider}</span>
                    </div>
                    <span class="key-details">{truncateKey(key.key)}</span>
                    
                    <div
                      class="usage-bars"
                      title={$t('apiKeyModal.usage_tooltip')}
                    >
                      <div class="usage-bar-container">
                        <span class="usage-label">RPM</span>
                        <div class="usage-bar-track">
                          <div
                            class="usage-bar-fill"
                            style="width: {usage.rpm}%"
                            data-usage-level={usage.level}
                          ></div>
                        </div>
                      </div>
                      <div class="usage-bar-container">
                        <span class="usage-label">RPD</span>
                        <div class="usage-bar-track">
                          <div
                            class="usage-bar-fill"
                            style="width: {usage.rpd}%"
                            data-usage-level={usage.level}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => handleRemoveKey(key)}
                    aria-label={$t('apiKeyModal.remove_key_aria')}
                    class="remove-btn"
                  >
                    <Icon name="trash-2" size={16} />
                  </Button>
                </li>
              {/each}
            {/if}
          </ul>
        </div>

        <div class="form-section add-key-section">
          <h3 class="section-title">{$t('apiKeyModal.add_key_header')}</h3>
          <form class="add-key-form" onsubmit={handleAddKey}>
            <div class="input-group">
              <label for="new-key-nickname">{$t('apiKeyModal.nickname_label')}</label>
              <input
                id="new-key-nickname"
                type="text"
                class="premium-input"
                placeholder={$t('apiKeyModal.nickname_placeholder')}
                bind:value={newApiNickname}
              />
            </div>
            <div class="input-group">
              <div class="label-row">
                <label for="new-key-input">{$t('apiKeyModal.api_key_label')}</label>
                <a
                  class="get-key-link"
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener"
                >
                  {$t('apiKeyModal.get_key_link')} <Icon name="external-link" size={12} />
                </a>
              </div>
              <input
                id="new-key-input"
                type="password"
                class="premium-input"
                placeholder={$t('apiKeyModal.api_key_placeholder')}
                bind:value={newApiKey}
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isDiscoveringModels}
              class="w-full"
            >
              {#if isDiscoveringModels}
                <Spinner size="sm" />
              {:else}
                <Icon name="plus" size={16} />
              {/if}
              {$t('apiKeyModal.add_key_button')}
            </Button>
          </form>
        </div>
      </div>
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

  /* --- Info Box --- */
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

  .tab-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  /* --- Forms --- */
  .form-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .section-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

  .section-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: var(--space-xs);
  }

  /* --- Premium Inputs --- */
  .premium-input {
    width: 100%;
    padding: 10px 12px;
    background-color: var(--color-background);
    border: 1px solid var(--color-border-input);
    border-radius: var(--radius-md);
    font-size: 0.95rem;
    color: var(--color-text);
    transition: all 0.2s ease;
  }

  .premium-input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px hsla(var(--color-accent-hsl) / 0.15);
  }

  /* --- Custom Select --- */
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

  /* --- Key List --- */
  .key-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .key-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    padding: var(--space-md);
    background-color: var(--color-background-raised);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    transition: all 0.2s ease;
  }
  
  .key-item:hover {
    border-color: var(--color-accent);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .key-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    background-color: hsla(var(--color-accent-hsl) / 0.1);
    color: var(--color-accent);
    border-radius: var(--radius-md);
    flex-shrink: 0;
  }

  .key-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 4px;
  }

  .key-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .key-nickname {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-text);
  }

  .key-provider-badge {
    font-size: 0.7rem;
    text-transform: uppercase;
    background-color: var(--color-gray-100);
    color: var(--color-text-secondary);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-weight: 600;
  }

  .key-details {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
  }

  .empty-state-keys {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-xl);
    color: var(--color-text-secondary);
    background: var(--color-background-raised);
    border-radius: var(--radius-lg);
    border: 1px dashed var(--color-border);
  }

  .add-key-section {
    background-color: var(--color-background-raised);
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
  }

  .add-key-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .label-row label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .get-key-link {
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 500;
  }

  .get-key-link:hover {
    text-decoration: underline;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
  }

  /* --- Usage Bars --- */
  .usage-bars {
    display: flex;
    gap: var(--space-lg);
    margin-top: var(--space-sm);
  }

  .usage-bar-container {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-grow: 1;
    max-width: 180px;
  }

  .usage-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    width: 24px;
  }

  .usage-bar-track {
    flex-grow: 1;
    height: 4px;
    background-color: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }

  .usage-bar-fill {
    height: 100%;
    background-color: var(--color-success-text);
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .usage-bar-fill[data-usage-level='high'] {
    background-color: var(--chart-color-3);
  }

  .usage-bar-fill[data-usage-level='critical'] {
    background-color: var(--color-danger);
  }
  
  .mb-2 {
    margin-bottom: var(--space-sm);
  }
  
  :global(.w-full) {
    width: 100%;
  }
  
  :global(.text-accent) {
    color: var(--color-accent);
  }
</style>
