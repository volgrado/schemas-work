<script lang="ts">
  import {
    settingsState,
    addApiKey,
    removeApiKey,
    type ApiKey,
  } from '$lib/modules/settings/ui/settingsStore.svelte';
  import { getModelById } from '$lib/modules/ai/aiModels';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Spinner from '$lib/core/ui/Spinner.svelte';
  import { toast } from 'svelte-sonner';
  import { i18n } from '$lib/utils/i18n.svelte';
  import { fade, slide } from 'svelte/transition';

  const { isDiscoveringModels, discoverModels } = $props<{
    isDiscoveringModels: boolean;
    discoverModels: (key: string) => Promise<boolean>;
  }>();

  let newApiKey = $state('');
  let newApiNickname = $state('');

  async function handleAddKey(event: SubmitEvent) {
    event.preventDefault();
    const keyToAdd = newApiKey.trim();
    if (!keyToAdd) {
      toast.error(i18n.t('apiKeyModal.toast.empty_key_error'));
      return;
    }
    const isValid = await discoverModels(keyToAdd);
    if (isValid) {
      addApiKey(keyToAdd, 'gemini', newApiNickname.trim());
      toast.success(i18n.t('apiKeyModal.toast.key_added_success'));
      newApiKey = '';
      newApiNickname = '';
    }
  }

  function handleRemoveKey(key: ApiKey) {
    if (
      confirm(
        i18n.t('apiKeyModal.confirm.remove_key', {
          name: key.nickname || key.id,
        })
      )
    ) {
      removeApiKey(key.id);
      toast.info(i18n.t('apiKeyModal.toast.key_removed_info'));
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
</script>

<div class="tab-panel" in:fade={{ duration: 200 }}>
  <div class="info-box">
    <Icon name="shield" size={18} class="text-accent" />
    <p class="explanation">{i18n.t('apiKeyModal.explanation_keys')}</p>
  </div>

  <div class="form-section">
    <h3 class="section-title">{i18n.t('apiKeyModal.your_keys_header')}</h3>
    <ul class="key-list">
      {#if settingsState.apiKeys.length === 0}
        <div class="empty-state-keys">
          <Icon name="key" size={24} class="text-muted mb-2" />
          <p>{i18n.t('apiKeyModal.empty_state')}</p>
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
                  >{key.nickname || i18n.t('apiKeyModal.untitled_key')}</span
                >
                <span class="key-provider-badge">{key.provider}</span>
              </div>
              <span class="key-details">{truncateKey(key.key)}</span>

              <div
                class="usage-bars"
                title={i18n.t('apiKeyModal.usage_tooltip')}
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
              aria-label={i18n.t('apiKeyModal.remove_key_aria')}
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
    <h3 class="section-title">{i18n.t('apiKeyModal.add_key_header')}</h3>
    <form class="add-key-form" onsubmit={handleAddKey}>
      <div class="input-group">
        <label for="new-key-nickname"
          >{i18n.t('apiKeyModal.nickname_label')}</label
        >
        <input
          id="new-key-nickname"
          type="text"
          class="premium-input"
          placeholder={i18n.t('apiKeyModal.nickname_placeholder')}
          bind:value={newApiNickname}
        />
      </div>
      <div class="input-group">
        <div class="label-row">
          <label for="new-key-input"
            >{i18n.t('apiKeyModal.api_key_label')}</label
          >
          <a
            class="get-key-link"
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener"
          >
            {i18n.t('apiKeyModal.get_key_link')}
            <Icon name="external-link" size={12} />
          </a>
        </div>
        <input
          id="new-key-input"
          type="password"
          class="premium-input"
          placeholder={i18n.t('apiKeyModal.api_key_placeholder')}
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
        {i18n.t('apiKeyModal.add_key_button')}
      </Button>
    </form>
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

  .section-title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

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

  :global(.w-full) {
    width: 100%;
  }

  :global(.text-accent) {
    color: var(--color-accent);
  }
</style>
