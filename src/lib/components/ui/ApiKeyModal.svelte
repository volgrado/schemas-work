<!-- src/lib/components/ui/ApiKeyModal.svelte -->
<script lang="ts">
  import { settingsStore, type ApiKey } from '$lib/stores/settingsStore';
  import {
    supportedModels,
    createDiscoveredModel,
    getModelById,
    type AiModel,
  } from '$lib/services/ai/aiModels';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fetchAvailableGeminiModels } from '$lib/services/ai/modelDiscoveryService';
  import { t } from '$lib/utils/i18n';

  let { show, onClose } = $props<{
    show: boolean;
    onClose: () => void;
  }>();

  // --- Local State ---
  let newApiKey = $state('');
  let newApiNickname = $state('');

  // --- Discovery & Usage State ---
  let availableModelIds = $state<Set<string> | null>(null);
  let isLoadingModels = $state(false);
  let discoveredModels = $state<AiModel[]>([]);

  // --- Effects ---
  $effect(() => {
    // When the modal becomes visible, fetch available models
    if (show && !availableModelIds && !isLoadingModels) {
      const checkKey = $settingsStore.apiKeys.find(
        (k) => k.provider === 'gemini'
      );

      if (checkKey) {
        isLoadingModels = true;
        fetchAvailableGeminiModels(checkKey.key).then((liveIds) => {
          availableModelIds = liveIds;

          const knownModelIds = new Set(supportedModels.map((m) => m.id));
          const newModels: AiModel[] = [];
          for (const liveId of liveIds) {
            if (!knownModelIds.has(liveId)) {
              newModels.push(createDiscoveredModel(liveId));
            }
          }
          discoveredModels = newModels;
          isLoadingModels = false;
        });
      }
    }

    // Reset when the modal closes
    if (!show) {
      availableModelIds = null;
      discoveredModels = [];
    }
  });

  // --- Event Handlers & Helpers ---
  function handleAddKey() {
    if (!newApiKey.trim()) {
      toast.error($t('apiKeyModal.toast.empty_key_error'));
      return;
    }
    settingsStore.addApiKey(newApiKey.trim(), 'gemini', newApiNickname.trim());
    toast.success($t('apiKeyModal.toast.key_added_success'));
    newApiKey = '';
    newApiNickname = '';
  }

  function handleRemoveKey(key: ApiKey) {
    if (
      confirm(
        $t('apiKeyModal.confirm.remove_key', {
          name: key.nickname || key.id,
        })
      )
    ) {
      settingsStore.removeApiKey(key.id);
      toast.info($t('apiKeyModal.toast.key_removed_info'));
    }
  }

  function handleModelChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    settingsStore.selectModel(target.value);
  }

  function truncateKey(key: string): string {
    if (key.length < 12) return key;
    return `${key.slice(0, 5)}...${key.slice(-4)}`;
  }

  // Helper function to calculate usage percentage against the selected model's limits
  function getUsagePercentage(key: ApiKey): { rpm: number; rpd: number } {
    const model = getModelById($settingsStore.selectedModelId);
    if (!model || key.provider !== model.provider) {
      return { rpm: 0, rpd: 0 };
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
      model.rateLimits.rpm > 0
        ? (requestsInLastMinute / model.rateLimits.rpm) * 100
        : 0;
    const rpdPercentage =
      model.rateLimits.rpd > 0
        ? (requestsInLastDay / model.rateLimits.rpd) * 100
        : 0;

    return {
      rpm: Math.min(rpmPercentage, 100),
      rpd: Math.min(rpdPercentage, 100),
    };
  }
</script>

<Modal title={$t('apiKeyModal.title')} {show} {onClose}>
  <div class="ai-settings-content">
    <p class="explanation">{$t('apiKeyModal.explanation')}</p>

    <!-- Model Selection -->
    <div class="form-section">
      <label for="model-selector"
        >{$t('apiKeyModal.model_selector_label')}</label
      >
      <select
        id="model-selector"
        value={$settingsStore.selectedModelId}
        onchange={handleModelChange}
      >
        <optgroup label={$t('apiKeyModal.optgroup.supported')}>
          {#each supportedModels as model}
            {@const isAvailable = availableModelIds?.has(model.id)}
            <option
              value={model.id}
              disabled={availableModelIds !== null && !isAvailable}
            >
              {model.name}
              {#if isLoadingModels}
                {$t('apiKeyModal.model_loading')}
              {:else if availableModelIds !== null}
                {isAvailable
                  ? $t('apiKeyModal.model_available')
                  : $t('apiKeyModal.model_unavailable')}
              {/if}
            </option>
          {/each}
        </optgroup>

        {#if discoveredModels.length > 0}
          <optgroup label={$t('apiKeyModal.optgroup.discovered')}>
            {#each discoveredModels as model (model.id)}
              <option
                value={model.id}
                title={$t('apiKeyModal.discovered_model_tooltip')}
              >
                {model.name}
              </option>
            {/each}
          </optgroup>
        {/if}
      </select>
    </div>

    <!-- Manage API Keys -->
    <div class="form-section">
      <h3>{$t('apiKeyModal.your_keys_header')}</h3>
      <ul class="key-list">
        {#if $settingsStore.apiKeys.length === 0}
          <p class="empty-state">{$t('apiKeyModal.empty_state')}</p>
        {:else}
          {#each $settingsStore.apiKeys as key (key.id)}
            {@const usage = getUsagePercentage(key)}
            <li class="key-item">
              <div class="key-info">
                <span class="key-nickname"
                  >{key.nickname || $t('apiKeyModal.untitled_key')}</span
                >
                <span class="key-details">
                  {key.provider} &bull; {truncateKey(key.key)}
                </span>
                <div class="usage-bars" title={$t('apiKeyModal.usage_tooltip')}>
                  <div class="usage-bar-container">
                    <span class="usage-label"
                      >{$t('apiKeyModal.rpm_label')}</span
                    >
                    <div class="usage-bar-track">
                      <div
                        class="usage-bar-fill"
                        style="width: {usage.rpm}%"
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
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="icon"
                onclick={() => handleRemoveKey(key)}
                aria-label={$t('apiKeyModal.remove_key_aria')}
              >
                <Icon name="trash-2" size={16} />
              </Button>
            </li>
          {/each}
        {/if}
      </ul>
    </div>

    <!-- Add New Key -->
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
          <label for="new-key-input">{$t('apiKeyModal.api_key_label')}</label>
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
            rel="noopener"
          >
            {$t('apiKeyModal.get_key_link')}
          </a>
        </div>
        <Button type="submit" variant="secondary">
          <Icon name="plus" size={16} />
          {$t('apiKeyModal.add_key_button')}
        </Button>
      </form>
    </div>

    <div class="modal-actions">
      <Button onclick={onClose}>{$t('common.close')}</Button>
    </div>
  </div>
</Modal>

<style>
  .ai-settings-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }
  .explanation {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: -10px;
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
    background-color: var(--color-background-secondary);
    border-radius: var(--radius-md);
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
  .empty-state {
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
  }
  .usage-label {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
  }
  .usage-bar-track {
    flex-grow: 1;
    height: 6px;
    background-color: var(--color-gray-200);
    border-radius: 3px;
    overflow: hidden;
  }
  .usage-bar-fill {
    height: 100%;
    background-color: var(--color-accent);
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  :global(.dark-theme) .usage-bar-track {
    background-color: var(--color-gray-700);
  }
</style>
