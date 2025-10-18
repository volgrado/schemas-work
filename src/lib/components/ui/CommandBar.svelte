<!--
  @component
  CommandBar

  This component serves as the application's central command palette, providing a
  fast, keyboard-driven interface for accessing most of the app's functionality.
  It is heavily inspired by command palettes in modern code editors like VS Code.

  Key Features:
  - Activated via a global keyboard shortcut (Cmd/Ctrl + K).
  - Acts as an orchestrator, launching other specialized modals (AI Helper, Password, Diagnostics).
  - Features a multi-view system to organize commands:
    - `main`: The default view with primary actions.
    - `ai-actions`: A view dedicated to AI-powered commands.
    - `list-schemas`: A file explorer-like view for navigating documents.
  - State is managed centrally in the `commandBarStore`, making it accessible app-wide.
  - Handles complex workflows like AI-powered content generation and encrypted vault backups.
-->
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

  // --- Command Bar Views ---
  import MainView from './command-bar/MainView.svelte';
  import AiView from './command-bar/AiView.svelte';
  import FileExplorerView from './command-bar/FileExplorerView.svelte';

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
  // MODIFIED: Import NewCard type to assist with type assertion
  import type { Card, NewCard } from '$lib/types';

  const state = commandBarStore;

  /**
   * Configuration object for the AI Helper modal.
   * Each key corresponds to an `AiHelperAction` and defines the modal's behavior,
   * including its title, the AI prompt, the Zod schema for validating the response,
   * and the callback function to apply the result.
   */
  const aiHelperConfigs = {
    'create-schema-from-text': {
      title: $t('command_bar.ai_helper.create_schema.title'),
      prompt: Prompts.CREATE_SCHEMA_FROM_TEXT_PROMPT_V4_PEDAGOGICAL.replace(
        '{{TEXT_INPUT}}',
        $t('command_bar.ai_helper.create_schema.prompt_placeholder')
      ),
      validationSchema: aiSchemas.CreateSchemaAiResponseSchema,
      onApply: (data: any) => {
        const title = data.content?.[0]?.content?.[0]?.text || 'New Schema';
        const parentId = get(state).currentParentId;
        documentStore.createNewDocument(title, data, parentId);
        toast.success(
          $t('command_bar.ai_helper.create_schema.success', { title })
        );
      },
    },
    'expand-node': {
      title: $t('command_bar.ai_helper.expand_node.title'),
      prompt: Prompts.EXPAND_NODE_PROMPT_V4_PEDAGOGICAL, // Base prompt, context is added later
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
    'generate-flashcards': {
      title: $t('command_bar.ai_helper.generate_flashcards.title'),
      prompt: Prompts.GENERATE_FLASHCARDS_V2_PROMPT, // Base prompt, context is added later
      validationSchema: aiSchemas.FlashcardResponseSchema,
      onApply: async (data: Omit<Card, 'id' | 'nodeId'>[]) => {
        const { selectedNode: node } = get(editorStore);
        if (!node?.attrs.nodeId) {
          toast.error(
            $t('command_bar.ai_helper.generate_flashcards.error.no_node_id')
          );
          return;
        }
        try {
          // MODIFIED: Use a type assertion to satisfy the stricter `NewCard[]` type.
          // This is safe because the Zod schema has already validated the data structure.
          await cardService.addCards(
            node.attrs.nodeId,
            data as unknown as NewCard[]
          );
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

  // --- Local State ---
  let passwordInput = '';
  let helperConfig = {
    title: '',
    prompt: '',
    validationSchema: z.any() as z.ZodSchema,
    onApply: (data: any) => {},
  };

  // --- Reactive Logic ---
  // When the AI helper is opened, configure it based on the requested action.
  $: if ($state.isAiHelperOpen && $state.aiHelperAction) {
    configureAiHelper($state.aiHelperAction);
  }

  /**
   * Sets up the configuration for the AI Helper modal based on the action ID.
   * It fetches the base config and dynamically injects context-specific information
   * (like selected text or breadcrumbs) into the AI prompt.
   * @param {AiHelperAction} actionId - The ID of the AI action to configure.
   */
  function configureAiHelper(actionId: AiHelperAction) {
    const config = aiHelperConfigs[actionId];
    if (!config) return;

    let finalConfig = { ...config };
    const {
      instance: editor,
      selectedNodePos: currentPos,
      selectedNode: node,
    } = get(editorStore);

    if (actionId === 'expand-node') {
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
      finalConfig.prompt = config.prompt
        .replaceAll('{{NODE_TEXT}}', node.textContent)
        .replace('{{CONTEXT_BREADCRUMB}}', breadcrumb);
    } else if (actionId === 'generate-flashcards') {
      if (!node) {
        toast.error(
          $t('command_bar.ai_helper.generate_flashcards.error.no_node_selected')
        );
        commandBarStore.closeAiHelper();
        return;
      }
      finalConfig.prompt = config.prompt.replace(
        '{{NODE_TEXT}}',
        node.textContent
      );
    }

    helperConfig = finalConfig;
  }

  /**
   * Handles the submission of the password modal for vault import/export.
   */
  async function handlePasswordSubmit() {
    if (!passwordInput) return;
    try {
      if ($state.passwordModalAction === 'export') {
        await backupService.exportVault(passwordInput);
        toast.success($t('command_bar.export_success'));
      } else {
        await backupService.importVault(passwordInput);
      }
    } catch (error) {
      errorService.reportError(error, {
        operation: `backup:${$state.passwordModalAction}`,
      });
      toast.error($t('command_bar.operation_failed'), {
        description: $t('command_bar.operation_failed_details'),
      });
    } finally {
      commandBarStore.closePasswordModal();
      passwordInput = '';
    }
  }

  /**
   * Global keydown handler to open/close the command bar.
   */
  function handleKeydown(event: KeyboardEvent) {
    // Do not interfere if another modal is active on top of the command bar.
    if ($state.isPasswordModalOpen || $state.isAiHelperOpen) return;

    // The primary shortcut to open/close the command bar.
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commandBarStore.toggle();
    }

    // 'Escape' key behavior: go back one view or close the bar.
    if (event.key === 'Escape' && $state.isOpen) {
      if ($state.currentView !== 'main') {
        commandBarStore.setView('main');
      } else {
        commandBarStore.close();
      }
    }
  }

  onMount(() => window.addEventListener('keydown', handleKeydown));
  onDestroy(() => window.removeEventListener('keydown', handleKeydown));
</script>

<!-- Orchestrated Modals -->
<ErrorDiagnosticModal
  show={$state.isDiagnosticModalOpen}
  onClose={commandBarStore.closeDiagnosticModal}
/>

<Modal
  title={$state.passwordModalAction === 'export'
    ? $t('command_bar.password_modal.title.export')
    : $t('command_bar.password_modal.title.import')}
  show={$state.isPasswordModalOpen}
  onClose={commandBarStore.closePasswordModal}
>
  <form on:submit|preventDefault={handlePasswordSubmit}>
    <p>
      {$state.passwordModalAction === 'export'
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
      <Button on:click={commandBarStore.closePasswordModal} variant="secondary"
        >{$t('command_bar.password_modal.cancel_button')}</Button
      >
      <Button type="submit">
        {$state.passwordModalAction === 'export'
          ? $t('command_bar.password_modal.confirm_button.export')
          : $t('command_bar.password_modal.confirm_button.import')}
      </Button>
    </div>
  </form>
</Modal>

<AIHelperModal
  show={$state.isAiHelperOpen}
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
{#if $state.isOpen}
  <button
    class="overlay"
    on:click={commandBarStore.close}
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
    {#if $state.currentView === 'main'}
      <MainView />
    {:else if $state.currentView === 'ai-actions'}
      <AiView />
    {:else if $state.currentView === 'list-schemas'}
      <FileExplorerView />
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

  /*
    The `:global` keyword is used here to style elements that are part of the child
    view components (MainView, AiView, etc.). This allows the CommandBar to enforce
    a consistent style for all its different views without duplicating CSS.
  */
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
