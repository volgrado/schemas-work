/**
 * @file commandService.ts
 * @service
 * @description Central registry for all application commands, designed for the Svelte 5 Runes architecture.
 */

import type { Search, TTS } from '$lib/types';
import { get } from 'svelte/store';
import { t } from '$lib/utils/i18n';
import { toast } from 'svelte-sonner';
import {
  commandBarState,
  setView,
  close,
  openDiagnosticModal,
  openStrategySession,
} from '$lib/modules/command-bar/ui/commandBarStore.svelte';
import { documentState, create as createDocument } from '$lib/stores/documentStore.svelte';
import { editorState } from '$lib/modules/editor/ui/editorStore.svelte';
import { ttsState, startReading } from '$lib/modules/tts/ui/ttsStore.svelte';
import { getReadableNodes } from '$lib/modules/tts/infra/ttsUtils';

export interface SearchOptions {
  openApiKeyModal: () => void;
}

export function getCommands(
  openApiKeyModal: () => void,
  ttsStatus: TTS.Status,
  isEditorReady: boolean
): Search.Command[] {
  const _t = get(t);
  return [
    {
      id: 'new-schema',
      label: _t('command.new_schema'),
      icon: 'plus',
      action: () => {
        const parentId = commandBarState.viewPayload?.parentId || null;
        createDocument(
          _t('file_explorer.default_schema_name'),
          undefined,
          parentId
        );
        close();
      },
    },
    {
      id: 'switch-schema',
      label: _t('command.explore_schemas'),
      icon: 'folder',
      action: () => setView('file-explorer'),
    },
    {
      id: 'study-decks',
      label: _t('command.study_decks'),
      icon: 'book-open',
      action: () => setView('study-hub'),
    },
    {
      id: 'ai-submenu',
      label: _t('command.ai_assistant'),
      icon: 'sparkles',
      action: () => setView('ai-actions'),
    },
    {
      id: 'read-aloud',
      label: _t('command.read_schema'),
      icon: 'volume-2',
      // --- FINAL, ROBUST ACTION TO SOLVE TIMING ISSUES ---
      action: () => {
        const { instance: editor } = editorState;
        if (editor) {
          // 1. Force ID Generation: Run the command from your NodeIdExtension
          //    to retroactively add IDs to any nodes that are missing them.
          editor.chain().focus().ensureNodeIds().run();

          // 2. Get Readable Nodes: Now that we know the IDs exist,
          //    call your utility function to create the narration script.
          const nodesToRead = getReadableNodes(editor);

          // 3. Start Reading: Pass the perfectly formed script to the store.
          startReading(nodesToRead);
        } else {
          toast.error(_t('common.editor_not_ready'));
        }
        close();
      },
      isEnabled: () => ttsStatus !== 'playing' && isEditorReady,
    },
    {
      id: 'vault-management',
      label: _t('command.vault_management'),
      icon: 'lock',
      action: () => setView('vault'),
    },
    {
      id: 'set-api-key',
      label: _t('command.set_api_key'),
      icon: 'key',
      action: () => {
        openApiKeyModal();
        close();
      },
    },
    {
      id: 'report-problem',
      label: _t('command.diagnostics_and_error_report'),
      icon: 'help-circle',
      action: () => openDiagnosticModal(),
    },
  ];
}

export function getAiCommands(
  isNodeSelected: boolean,
  isTextSelected: boolean,
  hasActiveDocument: boolean,
  hasEditorInstance: boolean
): Search.Command[] {
  const _t = get(t);
  return [
    {
      id: 'create-schema-from-text',
      label: _t('command.create_schema_from_text'),
      icon: 'sparkles',
      action: () => {
        openStrategySession({ action: 'create-schema-from-text' });
      },
    },
    {
      id: 'refine-document-with-ai',
      label: _t('command.refine_document_with_ai'),
      icon: 'edit-3',
      action: () => {
        const { instance: editorInstance } = editorState;
        if (editorInstance) {
          openStrategySession({
            action: 'refine-document',
            fullDocumentJSON: editorInstance.state.doc.toJSON(),
          });
        } else {
          toast.error('Cannot refine: The editor component is not available.');
        }
      },
      isEnabled: () => hasActiveDocument && hasEditorInstance,
    },
    {
      id: 'generate-flashcards-document',
      label: _t('command.generate_study_cards_for_document'),
      icon: 'zap',
      action: () => {
        const docId = documentState.docId;
        const { instance: editorInstance } = editorState;
        if (docId && editorInstance) {
          openStrategySession({
            action: 'generate-flashcards-doc',
            docId,
            fullDocumentText: editorInstance.state.doc.textContent,
          });
        }
      },
      isEnabled: () => hasActiveDocument && hasEditorInstance,
    },
  ];
}

export async function searchCommands(
  query: string,
  options: SearchOptions
): Promise<Search.Command[]> {
  const ttsStatus = ttsState.status;
  const hasEditorInstance = !!editorState.instance;
  const isNodeSelected = editorState.selectedNode !== null;
  const isTextSelected = hasEditorInstance
    ? !editorState.instance!.state.selection.empty
    : false;
  const hasActiveDocument = !!documentState.docId;

  const primaryCommands = getCommands(
    options.openApiKeyModal,
    ttsStatus,
    hasEditorInstance
  );
  const aiCommands = getAiCommands(
    isNodeSelected,
    isTextSelected,
    hasActiveDocument,
    hasEditorInstance
  );
  const allAvailableCommands = [...primaryCommands, ...aiCommands];

  if (!query) {
    return allAvailableCommands.filter((command) =>
      command.isEnabled ? command.isEnabled() : true
    );
  }

  const lowerCaseQuery = query.toLowerCase();
  return allAvailableCommands.filter((command) => {
    const isCommandEnabled = command.isEnabled ? command.isEnabled() : true;
    return (
      isCommandEnabled && command.label.toLowerCase().includes(lowerCaseQuery)
    );
  });
}
