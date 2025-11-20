<!-- src/lib/components/ui/ApiKeyModal.svelte -->
<script lang="ts">
  // FIX: Import the state rune and action functions directly from the store.
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
      // FIX: Access rune state directly and add explicit type to callback parameter.
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
      // FIX: Call imported action function directly.
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
      // FIX: Call imported action function directly.
      removeApiKey(key.id);
      toast.info($t('apiKeyModal.toast.key_removed_info'));
      // FIX: Access rune state directly and add explicit type to callback parameter.
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
    // FIX: Access rune state directly.
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
    <div class="tabs">
      <button
        class="tab-button"
        class:active={activeTab === 'models'}
        onclick={() => (activeTab = 'models')}
      >
        <Icon name="sparkles" size={16} />
        {$t('apiKeyModal.tabs.models')}
      </button>
      <button
        class="tab-button"
        class:active={activeTab === 'keys'}
        onclick={() => (activeTab = 'keys')}
      >
        <Icon name="key" size={16} />
        {$t('apiKeyModal.tabs.keys')}
      </button>
    </div>

    {#if activeTab === 'models'}
      <div class="tab-panel">
        <p class="explanation">{$t('apiKeyModal.explanation_models')}</p>
        <div class="form-section">
          <label for="model-selector"
            >{$t('apiKeyModal.model_selector_label')}</label
          >
          <div class="select-wrapper">
            <select
              id="model-selector"
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
            {#if isDiscoveringModels}
              <Spinner size="sm" />
            {/if}
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'keys'}
      <div class="tab-panel">
        <p class="explanation">{$t('apiKeyModal.explanation_keys')}</p>
        <div class="form-section">
          <h3>{$t('apiKeyModal.your_keys_header')}</h3>
          <ul class="key-list">
            {#if settingsState.apiKeys.length === 0}
              <p class="empty-state-keys">{$t('apiKeyModal.empty_state')}</p>
            {:else}
              {#each settingsState.apiKeys as key (key.id)}
                {@const usage = getUsagePercentage(key)}
                <li class="key-item">
                  <div class="key-info">
                    <span class="key-nickname"
                      >{key.nickname || $t('apiKeyModal.untitled_key')}</span
                    >
                    <span class="key-details"
                      >{key.provider} &bull; {truncateKey(key.key)}</span
                    >
                    <div
                      class="usage-bars"
                      title={$t('apiKeyModal.usage_tooltip')}
                    >
                      <div class="usage-bar-container">
                        <span class="usage-label"
                          >{$t('apiKeyModal.rpm_label')}</span
                        >
                        <div class="usage-bar-track">
                          <div
                            class="usage-bar-fill"
                            style="width: {usage.rpm}%"
                            data-usage-level={usage.level}
                          ></div>
                        </div>
                      </div>
                      <div class="usage-bar-container">
                        <span class="usage-label"
                          >{$t('apiKeyModal.rpd_label')}</span
                        >
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
                    variant="icon"
                    onclick={() => handleRemoveKey(key)}
                    aria-label={$t('apiKeyModal.remove_key_aria')}
                    ><Icon name="trash-2" size={16} /></Button
                  >
                </li>
              {/each}
            {/if}
          </ul>
        </div>
        <div class="form-section">
          <h3>{$t('apiKeyModal.add_key_header')}</h3>
          <form class="add-key-form" onsubmit={handleAddKey}>
            <div class="input-group">
              <label for="new-key-nickname"
                >{$t('apiKeyModal.nickname_label')}</label
              >
              <input
                id="new-key-nickname"
                type="text"
                placeholder={$t('apiKeyModal.nickname_placeholder')}
                bind:value={newApiNickname}
              />
            </div>
            <div class="input-group">
              <label for="new-key-input"
                >{$t('apiKeyModal.api_key_label')}</label
              >
              <input
                id="new-key-input"
                type="password"
                placeholder={$t('apiKeyModal.api_key_placeholder')}
                bind:value={newApiKey}
                required
              />
              <a
                class="get-key-link"
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener">{$t('apiKeyModal.get_key_link')}</a
              >
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={isDiscoveringModels}
            >
              <Icon name={isDiscoveringModels ? 'loader' : 'plus'} size={16} />
              {$t('apiKeyModal.add_key_button')}
            </Button>
          </form>
        </div>
      </div>
    {/if}

    <div class="modal-actions">
      <Button onclick={onClose}>{$t('common.close')}</Button>
    </div>
  </div>
</Modal>

<style>
  /* Styles are unchanged and correct */
  .ai-settings-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }
  .explanation {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
  }
  .tabs {
    display: flex;
    gap: var(--space-xs);
    border-bottom: 1px solid var(--color-border);
  }
  .tab-button {
    padding: var(--space-sm) var(--space-md);
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .tab-button:hover {
    color: var(--color-text);
  }
  .tab-button.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }
  .tab-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .form-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .form-section h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-sm);
  }
  .select-wrapper {
    position: relative;
  }
  .key-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  .key-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-page-background);
    border-radius: var(--space-sm);
    border: 1px solid var(--color-border);
  }
  .key-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding-right: var(--space-sm);
  }
  .key-nickname {
    font-weight: 500;
  }
  .key-details {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    text-transform: capitalize;
  }
  .empty-state-keys {
    color: var(--color-text-secondary);
    font-style: italic;
    padding: var(--space-md);
    text-align: center;
  }
  .add-key-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .get-key-link {
    font-size: 0.8rem;
    text-align: right;
    color: var(--color-accent);
    text-decoration: none;
  }
  .get-key-link:hover {
    text-decoration: underline;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-md);
  }
  .usage-bars {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-sm);
  }
  .usage-bar-container {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-grow: 1;
    max-width: 200px;
  }
  .usage-label {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
  }
  .usage-bar-track {
    flex-grow: 1;
    height: 6px;
    background-color: var(--color-border);
    border-radius: 3px;
    overflow: hidden;
  }
  .usage-bar-fill {
    height: 100%;
    background-color: var(--color-accent);
    border-radius: 3px;
    transition:
      width 0.3s ease,
      background-color 0.3s ease;
  }
  .usage-bar-fill[data-usage-level='high'] {
    background-color: var(--chart-color-3); /* Orange/Warning */
  }
  .usage-bar-fill[data-usage-level='critical'] {
    background-color: var(--color-danger);
  }
</style>
