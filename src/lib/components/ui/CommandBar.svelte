<script lang="ts">
  // --- Svelte & Third-Party ---
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import { z } from 'zod';
  import { t } from '$lib/utils/i18n';

  // --- UI Components ---
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import AIHelperModal from '$lib/components/ai/AIHelperModal.svelte';
  import ErrorDiagnosticModal from '$lib/components/ui/ErrorDiagnosticModal.svelte';
  import ApiKeyModal from '$lib/components/ui/ApiKeyModal.svelte';
  import TextInputModal from '$lib/components/ui/TextInputModal.svelte';
  import StrategySessionModal from '$lib/components/ai/StrategySessionModal.svelte';

  // --- Services & Schemas ---
  import * as aiService from '$lib/services/ai/aiService';
  import {
    getModelById,
    createDiscoveredModel,
  } from '$lib/services/ai/aiModels';

  // --- Stores ---
  import { settingsStore } from '$lib/stores/settingsStore';

  // --- Command Bar Views ---
  import MainView from './command-bar/MainView.svelte';
  import AiView from './command-bar/AiView.svelte';
  import FileExplorerView from './command-bar/FileExplorerView.svelte';
  import StudyHubView from './command-bar/StudyHubView.svelte';
  import VaultView from './command-bar/VaultView.svelte';
  import DeckOptionsView from './command-bar/DeckOptionsView.svelte';
  import StatisticsView from './command-bar/StatisticsView.svelte';
  import SearchView from './command-bar/SearchView.svelte';

  // --- Stores ---
  import {
    commandBarStore,
    type AiHelperAction,
  } from '$lib/stores/commandBarStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';

  // --- Services & Schemas ---
  import * as backupService from '$lib/services/features/backupService';
  import * as Prompts from '$lib/services/ai/prompts';
  import * as aiSchemas from '$lib/schemas/aiSchemas';
  import * as schemaService from '$lib/services/features/schemaService';
  import * as cardService from '$lib/services/features/cardService';
  import * as errorService from '$lib/services/core/errorService';
  import type { Card, NewCard } from '$lib/types';

  const aiHelperConfigs = {
    'create-schema-from-text': {
      title: $t('command_bar.ai_helper.create_schema.title'),
      validationSchema: aiSchemas.CreateSchemaAiResponseSchema,
      onApply: (data: any) => {
        const title =
          data.content?.[0]?.content?.[0]?.text ||
          $t('document.new_schema_title');
        const parentId = get(commandBarStore).currentParentId;
        documentStore.createNewDocument(title, data, parentId);
        toast.success(
          $t('command_bar.ai_helper.create_schema.success', { title })
        );
      },
    },
    'expand-node': {
      title: $t('command_bar.ai_helper.expand_node.title'),
      validationSchema: aiSchemas.ExpandNodeAiResponseSchema,
      onApply: (data: any) => {
        const {
          instance: editor,
          selectedNodePos: currentPos,
          selectedNode: node,
        } = get(editorStore);
        if (editor && node && currentPos !== null) {
          editor
            .chain()
            .focus()
            .insertContentAt(currentPos + node.nodeSize - 1, data)
            .run();
          toast.success($t('command_bar.ai_helper.expand_node.success'));
        }
      },
    },
    'generate-flashcards-node': {
      title: $t('command_bar.ai_helper.generate_flashcards.title'),
      validationSchema: aiSchemas.FlashcardResponseSchema,
      onApply: async (data: Omit<Card, 'id' | 'deckId'>[]) => {
        const docId = get(documentStore).docId;
        if (!docId) {
          toast.error(
            $t('command_bar.ai_helper.generate_flashcards.error.no_node_id')
          );
          return;
        }
        try {
          await cardService.addCards(docId, data as unknown as NewCard[]);
          toast.success(
            $t('command_bar.ai_helper.generate_flashcards.success', {
              count: data.length,
            })
          );
        } catch (err) {
          errorService.reportError(err, {
            operation: 'aiGenerateCards.onApply',
          });
          toast.error(
            $t('command_bar.ai_helper.generate_flashcards.error.save_failed')
          );
        }
      },
    },
  };

  let isApiKeyModalOpen = $state(false);
  let passwordInput = '';
  let helperConfig = $state({
    title: '',
    prompt: '',
    validationSchema: z.any() as z.ZodSchema,
    onApply: (data: any) => {},
  });
  let isTextInputModalOpen = $state(false);

  $effect(() => {
    if ($commandBarStore.isAiHelperOpen && $commandBarStore.aiHelperAction) {
      configureAiHelper($commandBarStore.aiHelperAction);
    }
  });

  function configureAiHelper(actionId: AiHelperAction) {
    const config = aiHelperConfigs[actionId as keyof typeof aiHelperConfigs];
    if (!config) return;

    let finalPrompt = '';
    const {
      instance: editor,
      selectedNodePos: currentPos,
      selectedNode: node,
    } = get(editorStore);

    switch (actionId) {
      case 'create-schema-from-text':
        finalPrompt =
          Prompts.CREATE_SCHEMA_FROM_TEXT_PROMPT_V4_PEDAGOGICAL.replace(
            '{{TEXT_INPUT}}',
            $t('command_bar.ai_helper.create_schema.prompt_placeholder')
          );
        break;

      case 'expand-node':
        if (!node || !editor || currentPos === null) {
          toast.error(
            $t('command_bar.ai_helper.expand_node.error.no_node_selected')
          );
          commandBarStore.closeAiHelper();
          return;
        }
        const breadcrumb = schemaService.getBreadcrumbForPosition(
          editor.state.doc,
          currentPos
        );
        finalPrompt = Prompts.EXPAND_NODE_PROMPT_V4_PEDAGOGICAL.replaceAll(
          '{{NODE_TEXT}}',
          node.textContent
        ).replace('{{CONTEXT_BREADCRUMB}}', breadcrumb);
        break;

      case 'generate-flashcards-node':
        if (!node) {
          toast.error(
            $t(
              'command_bar.ai_helper.generate_flashcards.error.no_node_selected'
            )
          );
          commandBarStore.closeAiHelper();
          return;
        }
        finalPrompt = Prompts.GENERATE_FLASHCARDS_V2_PROMPT.replace(
          '{{NODE_TEXT}}',
          node.textContent
        );
        break;
    }

    helperConfig = {
      ...config,
      prompt: finalPrompt,
    };
  }

  async function handleAiAction(
    actionId: AiHelperAction,
    options: { forceManual?: boolean } = {}
  ) {
    commandBarStore.close();
    const forceManual = options.forceManual ?? false;
    const settings = get(settingsStore);

    let selectedModel = getModelById(settings.selectedModelId);
    if (!selectedModel) {
      selectedModel = createDiscoveredModel(settings.selectedModelId);
    }

    const selectedKey = settingsStore.getNextAvailableKey(
      selectedModel.provider,
      settings
    );

    if (actionId === 'create-schema-from-text' && selectedKey && !forceManual) {
      isTextInputModalOpen = true;
      return;
    }

    if (selectedKey && !forceManual) {
      const toastId = toast.loading(
        $t('command_bar.toast.running_action', {
          modelName: selectedModel.name,
        })
      );
      try {
        const config =
          aiHelperConfigs[actionId as keyof typeof aiHelperConfigs];
        if (!config)
          throw new Error($t('command_bar.errors.invalid_action_config'));

        let prompt = '';

        const { instance: editor, selectedNode } = get(editorStore);
        if (!selectedNode)
          throw new Error($t('command_bar.errors.node_selection_required'));

        if (actionId === 'expand-node' && editor) {
          const breadcrumb = schemaService.getBreadcrumbForPosition(
            editor.state.doc,
            get(editorStore).selectedNodePos!
          );
          prompt = Prompts.EXPAND_NODE_PROMPT_V4_PEDAGOGICAL.replaceAll(
            '{{NODE_TEXT}}',
            selectedNode.textContent
          ).replace('{{CONTEXT_BREADCRUMB}}', breadcrumb);
        } else if (actionId === 'generate-flashcards-node') {
          prompt = Prompts.GENERATE_FLASHCARDS_V2_PROMPT.replace(
            '{{NODE_TEXT}}',
            selectedNode.textContent
          );
        } else {
          throw new Error($t('command_bar.errors.automated_flow_error'));
        }

        settingsStore.recordApiKeyUsage(selectedKey.id);
        const result = await aiService.generateContent(
          prompt,
          selectedModel,
          selectedKey.key,
          config.validationSchema
        );

        const dataToApply =
          'content' in result ? (result as any).content : result;
        await config.onApply(dataToApply);
        toast.success($t('command_bar.toast.action_success'), { id: toastId });
      } catch (error: any) {
        toast.error(
          $t('command_bar.toast.action_failed', { message: error.message }),
          { id: toastId }
        );
        errorService.reportError(error, {
          operation: `handleAiAction:${actionId}`,
          model: selectedModel.id,
        });
      }
    } else {
      if (forceManual && selectedKey)
        toast.info($t('command_bar.toast.manual_helper_info'));
      else if (!selectedKey) {
        const providerKeys = settings.apiKeys.filter(
          (k) => k.provider === selectedModel.provider
        );
        if (providerKeys.length > 0)
          toast.info(
            $t('command_bar.toast.rate_limit_info', {
              provider: selectedModel.provider,
            })
          );
        else
          toast.info(
            $t('command_bar.toast.no_key_info', {
              provider: selectedModel.provider,
            })
          );
      }
      commandBarStore.openAiHelper(actionId);
    }
  }

  async function handleTextSubmitForSchemaCreation(text: string) {
    isTextInputModalOpen = false;
    const settings = get(settingsStore);

    let selectedModel = getModelById(settings.selectedModelId);
    if (!selectedModel) {
      selectedModel = createDiscoveredModel(settings.selectedModelId);
    }

    const selectedKey = settingsStore.getNextAvailableKey(
      selectedModel.provider,
      settings
    );
    if (!selectedKey) return;

    const toastId = toast.loading(
      $t('command_bar.toast.generating_schema', {
        modelName: selectedModel.name,
      })
    );
    try {
      const config = aiHelperConfigs['create-schema-from-text'];
      const prompt =
        Prompts.CREATE_SCHEMA_FROM_TEXT_PROMPT_V4_PEDAGOGICAL.replace(
          '{{TEXT_INPUT}}',
          text
        );

      settingsStore.recordApiKeyUsage(selectedKey.id);
      const result = await aiService.generateContent(
        prompt,
        selectedModel,
        selectedKey.key,
        config.validationSchema
      );

      await config.onApply(result);
      toast.success($t('command_bar.toast.schema_created_success'), {
        id: toastId,
      });
    } catch (error: any) {
      toast.error(
        $t('command_bar.toast.action_failed', { message: error.message }),
        { id: toastId }
      );
      errorService.reportError(error, {
        operation: `handleTextSubmitForSchemaCreation`,
        model: selectedModel.id,
      });
    }
  }

  async function handlePasswordSubmit() {
    if (!passwordInput) return;
    try {
      if ($commandBarStore.passwordModalAction === 'export') {
        await backupService.exportVault(passwordInput);
      } else {
        await backupService.importVault(passwordInput);
      }
    } catch (error) {
      errorService.reportError(error, {
        operation: `backup:${$commandBarStore.passwordModalAction}`,
      });
      // Toasts are now handled by the backupService for better encapsulation.
    } finally {
      commandBarStore.closePasswordModal();
      passwordInput = '';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (
      $commandBarStore.isPasswordModalOpen ||
      $commandBarStore.isAiHelperOpen ||
      isApiKeyModalOpen ||
      isTextInputModalOpen ||
      $commandBarStore.isStrategySessionOpen
    )
      return;

    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commandBarStore.toggle();
    }

    if (event.key === 'Escape' && $commandBarStore.isOpen) {
      if ($commandBarStore.currentView === 'deck-options') {
        commandBarStore.setView('study-hub');
      } else if ($commandBarStore.currentView !== 'main') {
        commandBarStore.setView('main');
      } else {
        commandBarStore.close();
      }
    }
  }

  // --- FIX: This function is required by SearchView ---
  function openApiKeyModal() {
    isApiKeyModalOpen = true;
    // It's good practice to close the command bar when opening a modal.
    commandBarStore.close();
  }

  onMount(() => window.addEventListener('keydown', handleKeydown));
  onDestroy(() => window.removeEventListener('keydown', handleKeydown));
</script>

<TextInputModal
  show={isTextInputModalOpen}
  title={$t('command_bar.text_input_modal.title')}
  placeholder={$t('command_bar.text_input_modal.placeholder')}
  onClose={() => (isTextInputModalOpen = false)}
  onsubmit={handleTextSubmitForSchemaCreation}
/>

<ApiKeyModal
  show={isApiKeyModalOpen}
  onClose={() => (isApiKeyModalOpen = false)}
/>

<ErrorDiagnosticModal
  show={$commandBarStore.isDiagnosticModalOpen}
  onClose={commandBarStore.closeDiagnosticModal}
/>

<StrategySessionModal show={$commandBarStore.isStrategySessionOpen} />

<Modal
  title={$commandBarStore.passwordModalAction === 'export'
    ? $t('command_bar.password_modal.title.export')
    : $t('command_bar.password_modal.title.import')}
  show={$commandBarStore.isPasswordModalOpen}
  onClose={commandBarStore.closePasswordModal}
>
  <form onsubmit={handlePasswordSubmit}>
    <p>
      {$commandBarStore.passwordModalAction === 'export'
        ? $t('command_bar.password_modal.description.export')
        : $t('command_bar.password_modal.description.import')}
    </p>
    <input
      type="password"
      bind:value={passwordInput}
      placeholder={$t('command_bar.password_modal.password_placeholder')}
      required
      autocomplete="new-password"
    />
    <div class="modal-actions">
      <Button onclick={commandBarStore.closePasswordModal} variant="secondary">
        {$t('command_bar.password_modal.cancel_button')}
      </Button>
      <Button type="submit">
        {$commandBarStore.passwordModalAction === 'export'
          ? $t('command_bar.password_modal.confirm_button.export')
          : $t('command_bar.password_modal.confirm_button.import')}
      </Button>
    </div>
  </form>
</Modal>

<AIHelperModal
  show={$commandBarStore.isAiHelperOpen}
  title={helperConfig.title}
  prompt={helperConfig.prompt}
  validationSchema={helperConfig.validationSchema}
  on:apply={(e) => {
    helperConfig.onApply(e.detail);
    commandBarStore.closeAiHelper();
  }}
  on:close={commandBarStore.closeAiHelper}
/>

<!-- Main CommandBar UI -->
{#if $commandBarStore.isOpen}
  <button
    class="overlay"
    onclick={commandBarStore.close}
    transition:fade={{ duration: 150 }}
    aria-label={$t('command_bar.close_aria_label')}
  ></button>

  <div
    class="panel"
    transition:fly={{ y: 20, duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="commandbar-title"
  >
    <!-- Dynamic View Rendering -->
    {#if $commandBarStore.currentView === 'main'}
      <MainView {openApiKeyModal} />
    {:else if $commandBarStore.currentView === 'ai-actions'}
      <AiView {handleAiAction} />
    {:else if $commandBarStore.currentView === 'search'}
      <!-- --- FIX: Pass the required functions as props to SearchView --- -->
      <SearchView {openApiKeyModal} {handleAiAction} />
    {:else if $commandBarStore.currentView === 'list-schemas'}
      <FileExplorerView />
    {:else if $commandBarStore.currentView === 'study-hub'}
      <StudyHubView />
    {:else if $commandBarStore.currentView === 'vault'}
      <VaultView />
    {:else if $commandBarStore.currentView === 'deck-options' && $commandBarStore.deckOptionsId}
      <DeckOptionsView deckId={$commandBarStore.deckOptionsId} />
    {:else if $commandBarStore.currentView === 'statistics'}
      <StatisticsView />
    {/if}
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background-color: var(--overlay-bg);
    z-index: calc(var(--z-command-bar) - 1);
    border: none;
    cursor: default;
  }

  .panel {
    position: fixed;
    top: 15%;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 640px;
    max-height: 70vh;
    box-sizing: border-box;
    background-color: var(--color-background-translucent);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    box-shadow: var(--shadow-xl);
    z-index: var(--z-command-bar);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: var(--space-xs);
  }

  :global(.panel .action-list) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-grow: 1;
    overflow-y: auto;
    min-height: 0;
    padding: var(--space-xs);
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) transparent;
  }

  :global(.panel .action-list::-webkit-scrollbar) {
    width: 6px;
  }
  :global(.panel .action-list::-webkit-scrollbar-thumb) {
    background-color: var(--scrollbar-thumb);
    border-radius: 4px;
  }

  :global(.panel .action-button) {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    border: none;
    background: none;
    font-family: var(--font-main);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
    border-radius: 8px;
    text-align: left;
    gap: 12px;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      transform 0.1s ease;
    outline: none;
  }

  :global(.panel .action-button:hover:not(:disabled)),
  :global(.panel .action-button:focus-visible) {
    background-color: var(--btn-hover-bg);
  }

  :global(.panel .action-button:focus-visible) {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  :global(.panel .action-button :global(svg)) {
    color: var(--color-gray-500);
    transition:
      transform 0.2s ease,
      color 0.2s ease;
  }

  :global(.panel .action-button:hover:not(:disabled) :global(svg)),
  :global(.panel .action-button:focus-visible :global(svg)) {
    color: var(--color-accent);
    transform: scale(1.1);
  }

  :global(.panel .action-button:active:not(:disabled)) {
    transform: scale(0.985);
  }
  :global(.panel .action-button:disabled) {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .modal-actions {
    margin-top: var(--space-md);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }

  /* --- Dark Mode --- */
  :global(.dark-theme) .overlay {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  :global(.dark-theme) .panel {
    background-color: var(--panel-bg-dark);
    border-color: var(--panel-border-dark);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  :global(.dark-theme .action-list) {
    scrollbar-color: var(--scrollbar-thumb-dark) transparent;
  }
  :global(.dark-theme .action-list::-webkit-scrollbar-thumb) {
    background-color: var(--scrollbar-thumb-dark);
  }

  :global(.dark-theme .action-button) {
    color: var(--color-text-dark);
  }
  :global(.dark-theme .action-button:hover:not(:disabled)),
  :global(.dark-theme .action-button:focus-visible) {
    background-color: var(--btn-hover-bg-dark);
  }
</style>
