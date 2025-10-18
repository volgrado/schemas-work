<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import { z } from 'zod';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import AIHelperModal from '$lib/components/ai/AIHelperModal.svelte';
  import ErrorDiagnosticModal from '$lib/components/ui/ErrorDiagnosticModal.svelte';
  import MainView from './command-bar/MainView.svelte';
  import AiView from './command-bar/AiView.svelte';
  import FileExplorerView from './command-bar/FileExplorerView.svelte';
  import {
    commandBarStore,
    type AiHelperAction,
  } from '$lib/stores/commandBarStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { editorStore } from '$lib/stores/editorStore';
  import * as backupService from '$lib/services/features/backupService';
  import * as Prompts from '$lib/services/ai/prompts';
  import * as aiSchemas from '$lib/schemas/aiSchemas';
  import * as schemaService from '$lib/services/features/schemaService';
  import * as cardService from '$lib/services/features/cardService';
  import * as errorService from '$lib/services/core/errorService';
  import type { Card } from '$lib/types';
  import { t } from '$lib/services/i18n';

  const state = commandBarStore;

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
        toast.success($t('command_bar.ai_helper.create_schema.success', { title }));
      },
    },
    'expand-node': {
      title: $t('command_bar.ai_helper.expand_node.title'),
      prompt: Prompts.EXPAND_NODE_PROMPT_V4_PEDAGOGICAL, // Prompt base
      validationSchema: aiSchemas.ExpandNodeAiResponseSchema,
      onApply: (data: any) => {
        const editorState = get(editorStore);
        const editor = editorState.instance;
        const currentPos = editorState.selectedNodePos;
        const node =
          editor && currentPos !== null
            ? editor.state.doc.nodeAt(currentPos)
            : null;
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
      prompt: Prompts.GENERATE_FLASHCARDS_V2_PROMPT, // Prompt base
      validationSchema: aiSchemas.FlashcardResponseSchema,
      onApply: async (data: Omit<Card, 'id' | 'nodeId'>[]) => {
        const editorState = get(editorStore);
        const editor = editorState.instance;
        const currentPos = editorState.selectedNodePos;
        const node =
          editor && currentPos !== null
            ? editor.state.doc.nodeAt(currentPos)
            : null;

        if (!node?.attrs.nodeId) {
          toast.error($t('command_bar.ai_helper.generate_flashcards.error.no_node_id'));
          return;
        }
        try {
          await cardService.addCards(node.attrs.nodeId, data);
          toast.success($t('command_bar.ai_helper.generate_flashcards.success', { count: data.length }));
        } catch (err) {
          errorService.reportError(err, {
            operation: 'aiGenerateCards.onApply',
          });
          toast.error($t('command_bar.ai_helper.generate_flashcards.error.save_failed'));
        }
      },
    },
  };

  let passwordInput = '';
  let helperConfig = {
    title: '',
    prompt: '',
    validationSchema: z.any() as z.ZodSchema,
    onApply: (data: any) => {},
  };

  $: {
    if ($state.isAiHelperOpen && $state.aiHelperAction) {
      configureAiHelper($state.aiHelperAction);
    }
  }

  function configureAiHelper(actionId: AiHelperAction) {
    const config = aiHelperConfigs[actionId];
    if (!config) return;

    let finalConfig = { ...config };

    const editorState = get(editorStore);
    const editor = editorState.instance;
    const currentPos = editorState.selectedNodePos;
    const node =
      editor && currentPos !== null
        ? editor.state.doc.nodeAt(currentPos)
        : null;

    if (actionId === 'expand-node') {
      if (!node || !editor || currentPos === null) {
        toast.error($t('command_bar.ai_helper.expand_node.error.no_node_selected'));
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
        toast.error($t('command_bar.ai_helper.generate_flashcards.error.no_node_selected'));
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
      console.error(
        `Error during operation ${$state.passwordModalAction}:`,
        error
      );
      toast.error($t('command_bar.operation_failed'), {
        description: $t('command_bar.operation_failed_details'),
      });
    } finally {
      commandBarStore.closePasswordModal();
      passwordInput = '';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if ($state.isPasswordModalOpen || $state.isAiHelperOpen) return;

    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commandBarStore.toggle();
    }

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

{#if $state.isOpen}
  <button
    class="overlay"
    on:click={commandBarStore.close}
    transition:fade={{ duration: 150 }}
    aria-label={$t('command_bar.close_aria_label')}
  ></button>

  <div
    class="panel"
    class:is-list-view={$state.currentView === 'list-schemas'}
    transition:fly={{ y: 20, duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="commandbar-title"
  >
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
  :global(:root) {
    --panel-bg-light: rgba(255, 255, 255, 0.85);
    --panel-bg-dark: rgba(28, 28, 30, 0.85);
    --panel-border-light: rgba(0, 0, 0, 0.08);
    --panel-border-dark: rgba(255, 255, 255, 0.12);
    --overlay-bg: rgba(0, 0, 0, 0.1);
    --btn-hover-bg: rgba(0, 0, 0, 0.04);
    --btn-hover-bg-dark: rgba(255, 255, 255, 0.08);
    --scrollbar-thumb: rgba(0, 0, 0, 0.2);
    --scrollbar-thumb-dark: rgba(255, 255, 255, 0.2);
  }

  .overlay {
    position: fixed;
    inset: 0;
    background-color: var(--overlay-bg);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 99;
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
    background-color: var(--panel-bg-light);
    border: 1px solid var(--panel-border-light);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    z-index: 100;
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

  input[type='password'] {
    box-sizing: border-box;
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    margin-top: var(--space-sm);
    border: 1px solid var(--panel-border-light);
    border-radius: var(--space-sm);
    font-family: var(--font-main);
    font-size: 0.95rem;
    background-color: var(--color-background);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  input[type='password']:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(var(--color-accent), 0.2);
  }

  @media (prefers-color-scheme: dark) {
    :global(.panel .action-list) {
      scrollbar-color: var(--scrollbar-thumb-dark) transparent;
    }
    :global(.panel .action-list::-webkit-scrollbar-thumb) {
      background-color: var(--scrollbar-thumb-dark);
    }
    .panel {
      background-color: var(--panel-bg-dark);
      border-color: var(--panel-border-dark);
    }
    :global(.panel .action-button) {
      color: rgba(255, 255, 255, 0.95);
    }
    :global(.panel .action-button:hover:not(:disabled)),
    :global(.panel .action-button:focus-visible) {
      background-color: var(--btn-hover-bg-dark);
    }
    input[type='password'] {
      background-color: var(--color-gray-100);
      color: white;
      border-color: rgba(255, 255, 255, 0.15);
    }
  }
</style>
