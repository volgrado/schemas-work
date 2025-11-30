<!--
  @component
  StrategySessionModal

  @description
  The core interface for the "AI Action Workbench".
  Orchestrates the configuration and preview panels.
-->
<script lang="ts">
  import { getCommand } from '$lib/modules/ai/commands/CommandFactory';
  import type { WorkbenchState } from '$lib/modules/ai/commands/IAICommand';
  import {
    commandBarState,
    closeStrategySession,
    open as openCommandBar,
  } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
  import {
    settingsState,
    getNextAvailableKey,
  } from '$lib/modules/settings/ui/settingsStore.svelte';
  import { getModelById } from '$lib/modules/ai/aiModels';
  import {
    getCreateSchemaPrompt,
    getInteractiveRefinementPrompt,
    getGenerateCardsPrompt,

  } from '$lib/modules/ai/prompts';
  import * as aiService from '$lib/modules/ai/aiService';
  import { fade } from 'svelte/transition';
  import type { AiMessage } from '$lib/modules/ai/aiService';
  import {
    normalizeTiptapJSON,
    postProcessKaTeX,
  } from '$lib/utils/tiptapUtils';

  import { toast } from 'svelte-sonner';

  // --- UI Components ---
  import Modal from '$lib/core/ui/Modal.svelte';
  import Button from '$lib/core/ui/Button.svelte';
  import Icon from '$lib/core/ui/Icon.svelte';
  import Spinner from '$lib/core/ui/Spinner.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
  import type { SRS } from '$lib/types';
  
  import StrategyConfigPanel from './StrategyConfigPanel.svelte';
  import StrategyPreviewPanel from './StrategyPreviewPanel.svelte';

  const FILE_API_SIZE_LIMIT_MB = 50;

  let { show = $bindable() } = $props<{ show: boolean }>();

  // --- State Machine ---
  type View =
    | 'configure'
    | 'loading'
    | 'refine'
    | 'error';

  let view = $state<View>('configure');
  let errorMessage = $state('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let draftContent = $state<any>(null);
  let refinementText = $state('');
  let configurationInput = $state('');
  let selectedFiles = $state<File[]>([]);
  let cardQuantity = $state(10);
  let selectedCardTypes = $state<SRS.CardType[]>([
    'basic',
    'multiple_choice',
    'cloze',
    'matching',
    'sequencing',
  ]);

  // Manual Mode State
  let isManualMode = $state(false);
  let generatedPrompt = $state('');
  let pastedJson = $state('');
  let selectedModelId = $state(settingsState.selectedModelId);

  // Derived Context
  const command = $derived(
    commandBarState.strategySessionContext?.action
      ? getCommand(commandBarState.strategySessionContext.action)
      : null
  );

  const currentAction = $derived(
    commandBarState.strategySessionContext?.action
  );

  // --- Lifecycle ---
  function resetState() {
    view = 'configure';
    draftContent = null;
    errorMessage = '';
    refinementText = '';
    configurationInput = '';
    selectedFiles = [];
    generatedPrompt = '';
    pastedJson = '';
    cardQuantity = 10;
  }

  $effect(() => {
    if (show) {
      const context = commandBarState.strategySessionContext;

      // If we are refining existing content, skip configuration
      if (context?.action?.startsWith('refine-')) {
        const initialDocument = context.fullDocumentJSON;
        if (initialDocument) {
          draftContent = normalizeTiptapJSON(initialDocument);
          view = 'refine';
        } else {
          errorMessage = 'The document content was not available to refine.';
          view = 'error';
        }
      } else {
        // Default: Start at configuration
        view = 'configure';
      }
    }
    return () => resetState();
  });

  // --- Actions ---

  function handleFileSelect(files: File[]) {
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > FILE_API_SIZE_LIMIT_MB * 1024 * 1024) {
        toast.error(
          i18n.t('ai_workbench.errors.file_too_large', {
            default: `File is too large. The maximum size is ${FILE_API_SIZE_LIMIT_MB} MB.`,
            limit: FILE_API_SIZE_LIMIT_MB,
          })
        );
        continue;
      }
      validFiles.push(file);
    }
    selectedFiles = [...selectedFiles, ...validFiles];
  }

  /**
   * Orchestrates the generation request.
   */
  async function runGeneration(instruction: string) {
    const currentCommand = command;
    const actionStr = currentAction;

    if (!currentCommand || !actionStr) {
      return;
    }

    const currentWorkbenchState: WorkbenchState = {
      selectedText: null,
      draftContent: draftContent,
      selectedCards: [],
    };

    const promptContext = {
      ...commandBarState.strategySessionContext!,
      initialInput: configurationInput,
      quantity: cardQuantity,
      types: selectedCardTypes,
    };

    // 1. Generate the prompt using the Command logic
    const textPrompt = currentCommand.getPrompt(
      promptContext,
      currentWorkbenchState,
      instruction
    );

    // 2. Handle Manual Mode Flow
    if (isManualMode) {
      let finalPrompt = textPrompt;
      if (selectedFiles.length > 0) {
        const fileNames = selectedFiles.map((f) => `"${f.name}"`).join(', ');
        finalPrompt =
          `[USER NOTE: The following PDF files were attached: ${fileNames}. Remember to upload these files in your external tool before using the prompt below.]\n\n---\n\n` +
          textPrompt;
      }
      generatedPrompt = finalPrompt;
      // In new design, manual mode is just a view state, but we might want to trigger something?
      // Actually, the view handles it.
      return;
    }

    // 3. Handle Automated API Flow
    const model = getModelById(selectedModelId);
    const apiKeyObject = getNextAvailableKey('gemini');

    if (!model || !apiKeyObject) {
      errorMessage = i18n.t('aiHelper.errors.config_missing');
      view = 'error';
      return;
    }
    view = 'loading';

    const messages: AiMessage[] = [
      { role: 'user', parts: [{ text: textPrompt }] },
    ];

    try {
      // Call AI Service
      const rawResult = await aiService.generateContent(
        messages,
        model,
        apiKeyObject.key,
        currentCommand.validationSchema,
        selectedFiles
      );

      if (commandBarState.strategySessionContext?.action !== actionStr) {
        return; // User navigated away
      }

      // Normalization & Post-processing
      console.log('[StrategySessionModal] Raw AI Result:', rawResult);
      let normalizedResult = normalizeTiptapJSON(rawResult);
      console.log('[StrategySessionModal] Normalized Result:', normalizedResult);

      if (actionStr.includes('document') || actionStr.includes('schema') || actionStr === 'create-lesson-from-docs') {
        normalizedResult = postProcessKaTeX(normalizedResult);
      }

      if (!normalizedResult.content || normalizedResult.content.length === 0) {
        console.warn('[StrategySessionModal] AI returned empty content.');
        errorMessage = i18n.t('ai_workbench.errors.empty_response', {
          default: "The AI returned an empty document. Please try again with a more specific instruction."
        });
        view = 'error';
        return;
      }

      // Content Extraction based on type
      if (
        actionStr.includes('cards') ||
        actionStr.includes('flashcards') ||
        actionStr === 'generate-flashcards-doc'
      ) {
        draftContent = normalizedResult.content || [];
      } else {
        draftContent = normalizedResult;
      }
      console.log('[StrategySessionModal] Draft Content set:', draftContent);

      refinementText = '';
      view = 'refine';
    } catch (err: any) {
      errorMessage = err.message || i18n.t('aiHelper.errors.unknown');
      view = 'error';
    }
  }

  // --- Manual Mode Handlers ---

  function handleCopyToClipboard() {
    navigator.clipboard.writeText(generatedPrompt);
    toast.success('Prompt copied to clipboard!');
  }

  function handleProcessPastedJson() {
    if (!pastedJson || !command) return;
    try {
      const parsedData = JSON.parse(pastedJson);
      const validation = command.validationSchema.safeParse(parsedData);

      if (!validation.success) {
        errorMessage =
          'Pasted JSON is not valid for this command: ' +
          validation.error.message;
        view = 'error';
        return;
      }

      let normalizedResult = normalizeTiptapJSON(validation.data);
      if (
        currentAction?.includes('document') ||
        currentAction?.includes('schema')
      ) {
        normalizedResult = postProcessKaTeX(normalizedResult);
      }

      draftContent = normalizedResult;
      refinementText = '';
      pastedJson = '';
      view = 'refine';
      isManualMode = false; // Switch back to preview
    } catch (err: any) {
      errorMessage = 'Invalid JSON provided: ' + err.message;
      view = 'error';
    }
  }

  // --- Finalization ---

  async function handleApplyChanges() {
    if (command && draftContent) {
      await command.onAccept(
        draftContent,
        commandBarState.strategySessionContext!
      );
      closeStrategySession();
    }
  }

  function handleBack() {
    closeStrategySession();
    openCommandBar();
  }
</script>

<Modal
  {show}
  onClose={closeStrategySession}
  onBack={handleBack}
  title={command?.title || i18n.t('ai_workbench.default_title')}
  width="xl"
  class="workbench-modal"
>
  {#snippet footer()}
    <div class="workbench-footer-content">
      <div class="footer-left">
        <Button onclick={closeStrategySession} variant="ghost">
          {i18n.t('common.cancel')}
        </Button>
      </div>
      <div class="footer-right">
        {#if view === 'configure' || view === 'error'}
          <Button
            onclick={() => runGeneration('')}
            variant="primary"
            disabled={(!configurationInput && selectedFiles.length === 0) && !isManualMode}
          >
            <Icon name="sparkles" size={16} />
            {isManualMode ? 'Generate Prompt' : i18n.t('common.generate')}
          </Button>
        {:else if view === 'refine'}
          <div class="refine-controls">
            <input 
              type="text" 
              bind:value={refinementText} 
              placeholder="Refine with instructions..." 
              class="refine-input"
            />
            <Button
              onclick={() => runGeneration(refinementText)}
              variant="secondary"
              disabled={!refinementText}
              size="sm"
            >
              <Icon name="refresh-cw" size={16} />
            </Button>
          </div>
          <div class="divider"></div>
          <Button onclick={handleApplyChanges} variant="primary">
            <Icon name="check" size={16} />
            {i18n.t('common.accept_close')}
          </Button>
        {/if}
      </div>
    </div>
  {/snippet}

  <div class="workbench-container">
    <!-- Left Panel: Configuration -->
    <div class="panel-left">
      <StrategyConfigPanel
        bind:configurationInput
        bind:selectedFiles
        bind:selectedModelId
        bind:cardQuantity
        bind:selectedCardTypes
        bind:isManualMode
        {command}
        {currentAction}
        onFileSelect={handleFileSelect}
      />
    </div>

    <!-- Right Panel: Preview / Canvas -->
    <div class="panel-right">
      {#if view === 'loading'}
        <div class="status-overlay" transition:fade>
          <Spinner size="lg" />
          <p>{i18n.t('ai_workbench.loading_text')}</p>
        </div>
      {:else if view === 'error'}
        <div class="status-overlay error" transition:fade>
          <Icon name="alert-triangle" size={32} />
          <p>{i18n.t('ai_workbench.error_title')}</p>
          <pre>{errorMessage}</pre>
          <Button onclick={() => (view = 'configure')} variant="secondary">
            {i18n.t('common.try_again')}
          </Button>
        </div>
      {:else}
        <StrategyPreviewPanel
          {draftContent}
          {currentAction}
          {isManualMode}
          {generatedPrompt}
          bind:pastedJson
          onProcessJson={handleProcessPastedJson}
          onCopyPrompt={handleCopyToClipboard}
        />
      {/if}
    </div>
  </div>
</Modal>

<style>
  /* Workbench Layout */
  .workbench-container {
    display: grid;
    grid-template-columns: 320px 1fr;
    height: 70vh;
    min-height: 500px;
    gap: 0;
    overflow: hidden;
  }

  .panel-left {
    border-right: 1px solid var(--color-border);
    background: var(--color-background);
    padding: var(--space-lg);
    z-index: 2;
    min-height: 0; /* Prevent grid item blowout */
    overflow: hidden; /* Force child to handle scroll */
    display: flex;
    flex-direction: column;
  }

  .panel-right {
    position: relative;
    background: var(--color-bg-tertiary);
    overflow: hidden;
    min-height: 0; /* Prevent grid item blowout */
  }

  /* Footer Content */
  .workbench-footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  /* Refine Controls */
  .refine-controls {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: var(--color-bg-secondary);
    padding: 4px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
  }

  .refine-input {
    background: transparent;
    border: none;
    padding: 4px 12px;
    font-size: 0.9rem;
    color: var(--color-text);
    width: 200px;
    outline: none;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: var(--color-border);
  }

  /* Status Overlay */
  .status-overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(5px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    color: var(--color-text);
  }

  :global(.dark-theme) .status-overlay {
    background: rgba(0, 0, 0, 0.5);
  }

  .status-overlay.error {
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .workbench-container {
      grid-template-columns: 1fr;
      height: auto;
      min-height: 80vh;
    }

    .panel-left {
      border-right: none;
      border-bottom: 1px solid var(--color-border);
      max-height: 40vh;
      overflow-y: auto;
    }
  }
</style>
