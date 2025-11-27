<!--
  @component
  StrategySessionModal

  @description
  The core interface for the "AI Action Workbench".
  It orchestrates the entire generative AI workflow:
  1.  **Configuration:** Users provide instructions, upload context (PDFs), and set parameters.
  2.  **Generation:** The request is sent to the AI service (Gemini).
  3.  **Preview & Refinement:** The AI's output (Schema or Flashcards) is visualized. Users can refine it with further prompts.
  4.  **Application:** The final content is applied to the document or saved as cards.

  Features:
  - **Dual-Panel Layout:** Configuration on the left, Live Preview on the right.
  - **Manual Mode:** A fallback flow that generates a prompt for the user to copy-paste into an external AI tool (e.g., ChatGPT), then paste the JSON back.
  - **Multimodal:** Supports PDF file uploads for context-aware generation.
  - **Error Handling:** Robust error states with retry options.

  @props
  - `show` (bindable boolean): Visibility control.
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
  import * as aiService from '$lib/modules/ai/aiService';
  import { fade, fly } from 'svelte/transition';
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
  import TiptapPreview from '$lib/modules/ai/ui/TiptapPreview.svelte';
  import CardPreview from '$lib/modules/ai/ui/CardPreview.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
  import type { SRS } from '$lib/types';
  import Toggle from '$lib/core/ui/Toggle.svelte';

  const FILE_API_SIZE_LIMIT_MB = 50;

  let { show = $bindable() } = $props<{ show: boolean }>();

  // --- State Machine ---
  type View =
    | 'configure'
    | 'loading'
    | 'refine'
    | 'error'
    | 'manual-prompt'
    | 'manual-paste';

  let view = $state<View>('configure');
  let errorMessage = $state('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let draftContent = $state<any>(null);
  let refinementText = $state('');
  let configurationInput = $state('');
  let selectedPdfFile = $state<File | null>(null);
  let cardQuantity = $state(10);
  let selectedCardTypes = $state<SRS.CardType[]>([
    'basic',
    'input',
    'true_false',
    'multiple_choice',
    'cloze',
    'matching',
  ]);

  // Manual Mode State
  let isManualMode = $state(false);
  let generatedPrompt = $state('');
  let pastedJson = $state('');

  // DOM Refs
  let configTextarea = $state<HTMLTextAreaElement | null>(null);
  let refineTextarea = $state<HTMLTextAreaElement | null>(null);
  let tiptapPreviewInstance = $state<TiptapPreview | null>(null);
  let hasSelection = $state(false);

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
    hasSelection = false;
    selectedPdfFile = null;
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
          setTimeout(() => refineTextarea?.focus(), 100);
        } else {
          errorMessage = 'The document content was not available to refine.';
          view = 'error';
        }
      } else {
        // Default: Start at configuration
        view = 'configure';
        setTimeout(() => configTextarea?.focus(), 100);
      }
    }
    return () => resetState();
  });

  // --- Actions ---

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      if (file.size > FILE_API_SIZE_LIMIT_MB * 1024 * 1024) {
        toast.error(
          i18n.t('ai_workbench.errors.file_too_large', {
            default: `File is too large. The maximum size is ${FILE_API_SIZE_LIMIT_MB} MB.`,
            limit: FILE_API_SIZE_LIMIT_MB,
          })
        );
        target.value = '';
        selectedPdfFile = null;
        return;
      }
      selectedPdfFile = file;
    }
  }

  /**
   * Orchestrates the generation request.
   * Supports both direct API calls and the "Manual Mode" prompt generation flow.
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
      if (selectedPdfFile) {
        finalPrompt =
          `[USER NOTE: A PDF file named "${selectedPdfFile.name}" was attached. Remember to upload this file in your external tool before using the prompt below.]\n\n---\n\n` +
          textPrompt;
      }
      generatedPrompt = finalPrompt;
      view = 'manual-prompt';
      return;
    }

    // 3. Handle Automated API Flow
    const model = getModelById(settingsState.selectedModelId);
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
        selectedPdfFile
      );

      if (commandBarState.strategySessionContext?.action !== actionStr) {
        return; // User navigated away
      }

      // Normalization & Post-processing
      let normalizedResult = normalizeTiptapJSON(rawResult);

      if (actionStr.includes('document') || actionStr.includes('schema')) {
        normalizedResult = postProcessKaTeX(normalizedResult);
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

      refinementText = '';
      view = 'refine';
      setTimeout(() => refineTextarea?.focus(), 100);
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

  function handlePointerUp() {
    if (tiptapPreviewInstance) {
      const selection = tiptapPreviewInstance.getCurrentSelection();
      hasSelection = !!selection;
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
>
  <div class="session-container">
    <!-- View: Loading -->
    {#if view === 'loading'}
      <div class="status-overlay" transition:fade>
        <Spinner size="lg" />
        <p>{i18n.t('ai_workbench.loading_text')}</p>
      </div>

      <!-- View: Error -->
    {:else if view === 'error'}
      <div class="status-overlay error" transition:fade>
        <Icon name="alert-triangle" size={32} />
        <p>{i18n.t('ai_workbench.error_title')}</p>
        <pre>{errorMessage}</pre>
        <Button onclick={() => (view = 'configure')} variant="secondary">
          {i18n.t('common.try_again')}
        </Button>
      </div>
    {/if}

    <!-- View: Manual Mode Step 1 (Prompt) -->
    {#if view === 'manual-prompt'}
      <div class="manual-flow-panel" transition:fade>
        <h4 class="panel-title">
          <Icon name="copy" />
          <span>Step 1: Copy the Generated Prompt</span>
        </h4>
        <p class="panel-description">
          Copy this prompt and paste it into your preferred AI tool (like Google
          AI Studio).
        </p>
        <textarea readonly rows="15">{generatedPrompt}</textarea>
        <div class="manual-actions">
          <Button onclick={handleCopyToClipboard} variant="secondary">
            <Icon name="copy" size={16} />
            Copy to Clipboard
          </Button>
          <Button onclick={() => (view = 'manual-paste')} variant="primary">
            Next: Paste Response
          </Button>
        </div>
      </div>

      <!-- View: Manual Mode Step 2 (Paste) -->
    {:else if view === 'manual-paste'}
      <div class="manual-flow-panel" transition:fade>
        <h4 class="panel-title">
          <Icon name="pen-tool" />
          <span>Step 2: Paste the JSON Response</span>
        </h4>
        <p class="panel-description">
          After running the prompt, paste the complete, raw JSON output from the
          AI tool below.
        </p>
        <textarea
          bind:value={pastedJson}
          rows="15"
          placeholder="Paste the JSON response from the AI here..."
        ></textarea>
        <div class="manual-actions">
          <Button onclick={() => (view = 'manual-prompt')} variant="secondary">
            Back
          </Button>
          <Button
            onclick={handleProcessPastedJson}
            variant="primary"
            disabled={!pastedJson}
          >
            Process & Preview
          </Button>
        </div>
      </div>

      <!-- Standard Split View (Configure/Refine + Preview) -->
    {:else}
      <div class="panels-wrapper" class:loading={view === 'loading'}>
        <!-- Left Panel: Inputs -->
        <div
          class="left-panel"
          in:fly={{ y: 10, duration: 300, delay: 200 }}
          out:fade
        >
          {#if view === 'configure'}
            <div class="panel-section">
              <h4 class="panel-title">
                <Icon name="file-plus" />
                <span>{i18n.t('ai_workbench.configure.title')}</span>
              </h4>

              {#if currentAction?.includes('cards')}
                <div class="config-option">
                  <label for="card-quantity">Number of Cards</label>
                  <input
                    type="number"
                    id="card-quantity"
                    bind:value={cardQuantity}
                    min="1"
                    max="50"
                  />
                </div>

                <div class="config-option">
                  <span class="label">Card Types</span>
                  <div class="checkbox-group">
                    {#each ['basic', 'input', 'true_false', 'multiple_choice', 'cloze', 'matching'] as type}
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          value={type}
                          checked={selectedCardTypes.includes(type as any)}
                          onchange={(e) => {
                            const t = type as any;
                            if (e.currentTarget.checked) {
                              selectedCardTypes = [...selectedCardTypes, t];
                            } else {
                              selectedCardTypes = selectedCardTypes.filter(
                                (x) => x !== t
                              );
                            }
                          }}
                        />
                        {type.replace('_', ' ')}
                      </label>
                    {/each}
                  </div>
                </div>
              {/if}

              <p class="panel-description">
                {i18n.t(
                  command?.description || 'ai_workbench.configure.description'
                )}
              </p>
              <textarea
                bind:this={configTextarea}
                bind:value={configurationInput}
                rows="10"
                placeholder={i18n.t(
                  command?.placeholder || 'ai_workbench.configure.placeholder'
                )}
              ></textarea>

              <!-- PDF Upload -->
              <div class="context-upload-section">
                <h5 class="panel-subtitle">
                  <Icon name="paperclip" size={16} />
                  <span
                    >{i18n.t('ai_workbench.configure.pdf_context_title', {
                      default: 'Add PDF Context (Optional)',
                    })}</span
                  >
                </h5>
                <input
                  type="file"
                  accept=".pdf"
                  onchange={handleFileSelect}
                  id="pdf-upload"
                  class="file-input"
                />
                <label for="pdf-upload" class="file-label">
                  <Icon name="upload-cloud" size={16} />
                  {selectedPdfFile
                    ? i18n.t('common.change_file', { default: 'Change PDF' })
                    : i18n.t('common.upload_file', { default: 'Upload PDF' })}
                </label>
                {#if selectedPdfFile}
                  <p class="file-status" title={selectedPdfFile.name}>
                    <Icon name="file-text" size={14} />
                    {selectedPdfFile.name}
                  </p>
                {/if}
              </div>
            </div>
          {:else if view === 'refine'}
            <div class="panel-section">
              <h4 class="panel-title">
                <Icon name="edit-3" />
                <span>{i18n.t('ai_workbench.refine.title')}</span>
              </h4>
              <p class="panel-description">
                {i18n.t('ai_workbench.refine.description')}
              </p>
              <div class="quick-actions">
                {#each command?.quickActions || [] as quickAction (quickAction.label)}
                  <Button
                    onclick={() => runGeneration(quickAction.instruction)}
                    variant="secondary">{quickAction.label}</Button
                  >
                {/each}
              </div>
              <textarea
                bind:this={refineTextarea}
                bind:value={refinementText}
                rows="5"
                placeholder={hasSelection
                  ? i18n.t('ai_workbench.refine.placeholder_with_selection')
                  : i18n.t('ai_workbench.refine.placeholder')}
              ></textarea>
            </div>
          {/if}
        </div>

        <!-- Right Panel: Preview -->
        <div
          class="right-panel"
          in:fly={{ y: 10, duration: 300, delay: 300 }}
          out:fade
        >
          <h4 class="panel-title">
            <Icon name="eye" />
            <span>{i18n.t('ai_workbench.preview_title')}</span>
          </h4>
          <div class="preview-content-wrapper" onpointerup={handlePointerUp}>
            <div class="preview-content">
              {#if !draftContent}
                <div class="empty-preview">
                  <Icon name="sparkles" size={48} />
                  <p>{i18n.t('ai_workbench.empty_preview.title')}</p>
                  <span>{i18n.t('ai_workbench.empty_preview.description')}</span
                  >
                </div>
              {:else if currentAction?.includes('document') || currentAction?.includes('schema')}
                <TiptapPreview
                  bind:this={tiptapPreviewInstance}
                  content={draftContent}
                />
              {:else if currentAction?.includes('cards')}
                <CardPreview cards={draftContent} />
              {:else}
                <pre>{JSON.stringify(draftContent, null, 2)}</pre>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Footer Actions -->
  <footer class="modal-actions" out:fade>
    <div class="manual-toggle-wrapper">
      <Toggle
        bind:checked={isManualMode}
        labelText="Manual Mode"
        id="manual-mode-toggle"
      />
    </div>
    <Button onclick={closeStrategySession} variant="secondary">
      {i18n.t('common.cancel')}
    </Button>
    {#if view === 'configure'}
      <Button
        onclick={() => runGeneration('')}
        variant="primary"
        disabled={!configurationInput && !selectedPdfFile}
      >
        <Icon name="zap" size={16} />
        {isManualMode ? 'Get Prompt' : i18n.t('common.generate')}
      </Button>
    {:else if view === 'refine'}
      <Button
        onclick={() => runGeneration(refinementText)}
        variant="secondary"
        disabled={!refinementText}
      >
        <Icon name="refresh-cw" size={16} />
        {i18n.t('common.regenerate')}
      </Button>
      <Button onclick={handleApplyChanges} variant="primary">
        <Icon name="check" size={16} />
        {i18n.t('common.accept_close')}
      </Button>
    {/if}
  </footer>
</Modal>

<style>
  .session-container {
    position: relative;
    min-height: 480px;
  }
  .panels-wrapper {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-lg);
    padding: var(--space-sm) 0;
    transition: filter 0.3s ease;
  }
  .panels-wrapper.loading {
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
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-lg);
  }
  .right-panel {
    min-height: 300px;
  }
  @media (min-width: 768px) {
    .panels-wrapper {
      grid-template-columns: 350px 1fr;
    }
    .left-panel {
      border-right: 1px solid var(--color-border);
      border-bottom: none;
      padding-right: var(--space-lg);
      padding-bottom: 0;
    }
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
    margin: var(--space-sm) 0;
  }
  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    margin: var(--space-sm) 0 var(--space-md);
  }
  .preview-content-wrapper {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
    border-radius: var(--border-radius-sm);
  }
  .preview-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    background: var(--color-page-background);
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
    align-items: center;
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

  .context-upload-section {
    margin-top: var(--space-lg);
  }
  .panel-subtitle {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-sm) 0;
  }
  .file-input {
    width: 0.1px;
    height: 0.1px;
    opacity: 0;
    overflow: hidden;
    position: absolute;
    z-index: -1;
  }
  .file-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--border-radius-sm);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 0.9rem;
  }
  .file-label:hover {
    background-color: var(--color-bg-tertiary);
  }
  .file-status {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin: var(--space-sm) 0 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .config-option {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin: var(--space-sm) 0;
  }
  .config-option label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  .config-option input {
    width: 100%;
    padding: var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-sm);
    background-color: var(--color-background);
    color: var(--color-text);
  }
  .config-option .label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    display: block;
    margin-bottom: var(--space-xs);
  }
  .checkbox-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xs);
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.85rem;
    cursor: pointer;
    text-transform: capitalize;
  }
  .checkbox-label input {
    width: auto;
    margin: 0;
  }


  .manual-flow-panel {
    padding: var(--space-md) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-height: 480px;
  }
  .manual-flow-panel textarea {
    flex-grow: 1;
  }
  .manual-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }
  .manual-toggle-wrapper {
    margin-right: auto;
  }
</style>
