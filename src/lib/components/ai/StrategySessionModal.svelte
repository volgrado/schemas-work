<!-- src/lib/components/ai/StrategySessionModal.svelte -->
<script lang="ts">
  import { getCommand } from '$lib/services/ai/commands/CommandFactory';
  import type { WorkbenchState } from '$lib/services/ai/commands/IAICommand';
  import {
    commandBarState,
    closeStrategySession,
    type AiHelperAction,
  } from '$lib/stores/commandBarStore.svelte';
  import {
    settingsState,
    getNextAvailableKey,
  } from '$lib/stores/settingsStore.svelte';
  import { getModelById } from '$lib/services/ai/aiModels';
  import * as aiService from '$lib/services/ai/aiService';
  import { fade, fly } from 'svelte/transition';
  import type { AiMessage } from '$lib/services/ai/aiService';
  import type { SRS } from '$lib/types';
  type Card = SRS.Card;
  type NewCard = SRS.NewCard;

  // --- UI Components ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import TiptapPreview from '$lib/components/ai/TiptapPreview.svelte';
  import CardPreview from '$lib/components/ai/CardPreview.svelte';
  import { t } from '$lib/utils/i18n';

  let { show } = $props<{ show: boolean }>();

  type View = 'configure' | 'loading' | 'refine' | 'error';
  let view = $state<View>('configure');
  let errorMessage = $state('');
  let draftContent = $state<any>(null);
  let refinementText = $state('');
  let configurationInput = $state('');
  let configTextarea = $state<HTMLTextAreaElement | null>(null);
  let refineTextarea = $state<HTMLTextAreaElement | null>(null);

  let workbenchState = $state<WorkbenchState>({
    selectedText: null,
    selectedCards: [],
  });

  const command = $derived(
    commandBarState.strategySessionContext?.action
      ? getCommand(commandBarState.strategySessionContext.action)
      : null
  );

  function resetState() {
    view = 'configure';
    draftContent = null;
    errorMessage = '';
    refinementText = '';
    configurationInput = '';
    workbenchState = { selectedText: null, selectedCards: [] };
  }

  $effect(() => {
    if (show) {
      const context = commandBarState.strategySessionContext;
      // REMOVED: The check for `context?.action === 'expand-node'` is gone.
      if (context?.action.startsWith('refine-')) {
        view = 'refine';
        runGeneration('');
      } else {
        view = 'configure';
        setTimeout(() => configTextarea?.focus(), 100);
      }
    }
    return () => resetState();
  });

  $effect(() => {
    if (view === 'refine') setTimeout(() => refineTextarea?.focus(), 100);
  });

  async function runGeneration(instruction: string) {
    if (!command) return;
    const context = commandBarState.strategySessionContext!;
    const model = getModelById(settingsState.selectedModelId);
    const apiKeyObject = getNextAvailableKey('gemini');

    if (!model || !apiKeyObject) {
      errorMessage = $t('aiHelper.errors.config_missing');
      view = 'error';
      return;
    }
    view = 'loading';
    const promptContext = { ...context, initialInput: configurationInput };
    const prompt = command.getPrompt(
      promptContext,
      workbenchState,
      instruction
    );
    const messages: AiMessage[] = [{ role: 'user', parts: [{ text: prompt }] }];

    try {
      const result = await aiService.generateContent(
        messages,
        model,
        apiKeyObject.key,
        command.validationSchema
      );
      draftContent = result;
      refinementText = '';
      view = 'refine';
    } catch (err: any) {
      errorMessage = err.message || $t('aiHelper.errors.unknown');
      view = 'error';
    }
  }

  async function handleApplyChanges() {
    if (command && draftContent) {
      await command.onAccept(
        draftContent,
        commandBarState.strategySessionContext!
      );
      closeStrategySession();
    }
  }

  function handleCardSelectionUpdate(event: CustomEvent<Card[]>) {
    workbenchState.selectedCards = event.detail;
  }
</script>

<Modal
  {show}
  onClose={closeStrategySession}
  title={command?.title || $t('ai_workbench.default_title')}
  width="xl"
>
  <div class="session-container" class:loading={view === 'loading'}>
    {#if view === 'loading'}
      <div class="status-overlay" transition:fade>
        <Icon name="loader" size={32} />
        <p>{$t('ai_workbench.loading_text')}</p>
      </div>
    {:else if view === 'error'}
      <div class="status-overlay error" transition:fade>
        <Icon name="alert-triangle" size={32} />
        <p>{$t('ai_workbench.error_title')}</p>
        <pre>{errorMessage}</pre>
        <Button onclick={() => (view = 'configure')} variant="secondary"
          >{$t('common.try_again')}</Button
        >
      </div>
    {/if}

    <div
      class="left-panel"
      in:fly={{ y: 10, duration: 300, delay: 200 }}
      out:fade
    >
      {#if view === 'configure'}
        <div class="panel-section">
          <h4 class="panel-title">
            <Icon name="file-plus" /><span>
              {$t('ai_workbench.configure.title')}
            </span>
          </h4>
          <p class="panel-description">
            {$t('ai_workbench.configure.description')}
          </p>
          <textarea
            bind:this={configTextarea}
            bind:value={configurationInput}
            rows="15"
            placeholder={$t('ai_workbench.configure.placeholder')}
          ></textarea>
        </div>
      {:else if view === 'refine'}
        <div class="panel-section">
          <h4 class="panel-title">
            <Icon name="edit-3" /><span>{$t('ai_workbench.refine.title')}</span>
          </h4>
          <p class="panel-description">
            {$t('ai_workbench.refine.description')}
          </p>
          <div class="quick-actions">
            {#each command?.quickActions || [] as action}
              <Button
                onclick={() => runGeneration(action.instruction)}
                variant="secondary">{action.label}</Button
              >
            {/each}
          </div>
          <textarea
            bind:this={refineTextarea}
            bind:value={refinementText}
            rows="5"
            placeholder={$t('ai_workbench.refine.placeholder')}
          ></textarea>
        </div>
      {/if}
    </div>

    <div
      class="right-panel"
      in:fly={{ y: 10, duration: 300, delay: 300 }}
      out:fade
    >
      <h4 class="panel-title">
        <Icon name="eye" /><span>{$t('ai_workbench.preview_title')}</span>
      </h4>
      <div class="preview-content">
        {#if !draftContent}
          <div class="empty-preview">
            <Icon name="sparkles" size={48} />
            <p>{$t('ai_workbench.empty_preview.title')}</p>
            <span>{$t('ai_workbench.empty_preview.description')}</span>
          </div>
        {:else}
          {@const action = commandBarState.strategySessionContext?.action}
          <!-- REMOVED: The check for `action === 'expand-node'` is gone. -->
          {#if action?.includes('document') || action?.includes('schema')}
            <TiptapPreview
              content={draftContent}
              onSelectionUpdate={(from, to, text) =>
                (workbenchState.selectedText = from === to ? null : text)}
            />
          {:else if action?.includes('cards')}
            <CardPreview
              cards={draftContent}
              on:selectionUpdate={handleCardSelectionUpdate}
            />
          {:else}
            <pre>{JSON.stringify(draftContent, null, 2)}</pre>
          {/if}
        {/if}
      </div>
    </div>
  </div>

  <footer class="modal-actions" out:fade>
    <Button onclick={closeStrategySession} variant="secondary">
      {$t('common.cancel')}
    </Button>
    {#if view === 'configure'}
      <Button
        onclick={() => runGeneration('')}
        variant="primary"
        disabled={!configurationInput}
      >
        <Icon name="zap" size={16} />
        {$t('common.generate')}
      </Button>
    {:else if view === 'refine'}
      <Button
        onclick={() => runGeneration(refinementText)}
        variant="secondary"
        disabled={!refinementText}
      >
        <Icon name="refresh-cw" size={16} />
        {$t('common.regenerate')}
      </Button>
      <Button onclick={handleApplyChanges} variant="primary">
        <Icon name="check" size={16} />
        {$t('common.accept_close')}
      </Button>
    {/if}
  </footer>
</Modal>

<style>
  .session-container {
    position: relative;
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: var(--space-lg);
    min-height: 480px;
    padding: var(--space-sm) 0;
    transition: filter 0.3s ease;
  }
  .session-container.loading {
    filter: blur(4px);
    pointer-events: none;
  }
  .status-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    background-color: hsla(var(--color-accent-hsl) / 0.1);
    border-radius: var(--border-radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    color: var(--color-text);
  }
  .status-overlay.error {
    background-color: var(--color-danger-bg);
    color: var(--color-danger-text);
  }
  .status-overlay p {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0;
  }
  .status-overlay pre {
    background: hsla(0, 0%, 0%, 0.1);
    padding: var(--space-sm);
    border-radius: var(--border-radius-sm);
    max-width: 80%;
    font-size: 0.8rem;
    text-align: left;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .status-overlay :global(.icon-wrapper) {
    animation: spin 1.2s linear infinite;
    color: var(--color-accent);
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .left-panel,
  .right-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  .left-panel {
    border-right: 1px solid var(--color-border);
    padding-right: var(--space-lg);
  }
  .panel-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
  }
  .panel-description {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: -5px 0 0 0;
  }
  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    margin: var(--space-sm) 0 var(--space-md);
  }
  .preview-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    background: var(--color-page-background);
    border-radius: var(--border-radius-sm);
    overflow: hidden;
  }
  .empty-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-tertiary);
    text-align: center;
    padding: var(--space-lg);
    border: 2px dashed var(--color-border);
    border-radius: var(--border-radius-sm);
  }
  .empty-preview p {
    margin-top: var(--space-md);
    font-family: var(--font-main);
    font-size: 1.1rem;
    font-weight: 500;
  }
  .empty-preview span {
    font-size: 0.9rem;
    margin-top: var(--space-xs);
    max-width: 300px;
  }
  .empty-preview :global(.icon-wrapper) {
    color: var(--color-accent);
    opacity: 0.5;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border);
  }
  :global(.dark-theme) .left-panel,
  :global(.dark-theme) .modal-actions {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .empty-preview {
    border-color: var(--color-border-dark);
  }
</style>
