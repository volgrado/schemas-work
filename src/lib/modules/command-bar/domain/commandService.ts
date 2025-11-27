/**
 * @file commandService.ts
 * @module command-bar
 * @description
 * A centralized registry and factory for all application commands available via the Command Bar (Spotlight).
 *
 * This service is responsible for:
 * 1. Defining the list of available commands (Navigation, AI, Utilities).
 * 2. Handling the dynamic availability of commands (e.g., "Read Aloud" only when an editor is active).
 * 3. Executing command logic, which often involves coordinating multiple stores (Editor, TTS, Document).
 * 4. Filtering commands based on user search queries.
 */

import type { Search, TTS } from '$lib/types';
import { i18n } from '$lib/utils/i18n.svelte';
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

/**
 * Configuration options passed to the command factory.
 */
export interface SearchOptions {
  openApiKeyModal: () => void;
}

/**
 * Generates the list of primary (top-level) commands.
 *
 * @param openApiKeyModal - Callback to open the API Key settings modal.
 * @param ttsStatus - Current status of the Text-to-Speech engine.
 * @param isEditorReady - Whether the editor instance is initialized and mounted.
 * @returns {Search.Command[]} An array of executable command objects.
 */
export function getCommands(
  openApiKeyModal: () => void,
  ttsStatus: TTS.Status,
  isEditorReady: boolean
): Search.Command[] {
  const _t = i18n.t;
  return [
    {
      id: 'new-schema',
      label: _t('command.new_schema'),
      icon: 'plus',
      action: () => {
        // Create a new document in the current folder (if any)
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
      /**
       * Orchestrates the "Read Aloud" feature.
       * It ensures the document structure is valid (IDs exist) before extracting content.
       */
      action: () => {
        const { instance: editor } = editorState;
        if (editor) {
          // 1. Force ID Generation: Run the command from NodeIdExtension
          //    to retroactively add IDs to any nodes that might be missing them.
          editor.chain().focus().ensureNodeIds().run();

          // 2. Get Readable Nodes: Parse the document into a linear playlist.
          const nodesToRead = getReadableNodes(editor);

          // 3. Start Reading: Pass the script to the TTS store.
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

/**
 * Generates the list of context-aware AI commands.
 *
 * @param isNodeSelected - Whether a specific node (heading) is selected.
 * @param isTextSelected - Whether a text range is selected.
 * @param hasActiveDocument - Whether a document is currently open.
 * @param hasEditorInstance - Whether the editor is ready.
 * @returns {Search.Command[]} An array of AI commands.
 */
export function getAiCommands(
  isNodeSelected: boolean,
  isTextSelected: boolean,
  hasActiveDocument: boolean,
  hasEditorInstance: boolean
): Search.Command[] {
  const _t = i18n.t;
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
            // Pass the full document context for "Whole Document" refinement
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

/**
 * Performs a search against all available commands.
 *
 * @param query - The user's search string.
 * @param options - Configuration options.
 * @returns {Promise<Search.Command[]>} A filtered list of commands.
 */
export async function searchCommands(
  query: string,
  options: SearchOptions
): Promise<Search.Command[]> {
  // Gather context
  const ttsStatus = ttsState.status;
  const hasEditorInstance = !!editorState.instance;
  const isNodeSelected = editorState.selectedNode !== null;
  const isTextSelected = hasEditorInstance
    ? !editorState.instance!.state.selection.empty
    : false;
  const hasActiveDocument = !!documentState.docId;

  // Compile all commands
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

  // If no query, return all enabled commands (default view)
  if (!query) {
    return allAvailableCommands.filter((command) =>
      command.isEnabled ? command.isEnabled() : true
    );
  }

  // Perform case-insensitive substring search
  const lowerCaseQuery = query.toLowerCase();
  return allAvailableCommands.filter((command) => {
    const isCommandEnabled = command.isEnabled ? command.isEnabled() : true;
    return (
      isCommandEnabled && command.label.toLowerCase().includes(lowerCaseQuery)
    );
  });
}
