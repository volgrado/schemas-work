/**
 * @file commandService.ts
 * @description This service is responsible for dynamically generating and searching all commands
 * available in the application's command bar. It acts as a centralized registry for actions,
 * building the list of commands based on the current application state.
 */

import type { Command, TTSStatus } from '$lib/types';
import { get } from 'svelte/store';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { documentStore } from '$lib/stores/documentStore';
import { editorStore } from '$lib/stores/editorStore';
import { ttsStore } from '$lib/stores/ttsStore';
import { t } from '$lib/utils/i18n';
import { toast } from 'svelte-sonner';
import { getReadableNodes } from '$lib/utils/ttsUtils';

/**
 * Defines the signature for the AI action handler function passed from the UI.
 */
export type AiActionHandler = (
  action:
    | 'create-schema-from-text'
    | 'generate-flashcards-node'
    | 'expand-node',
  options?: { forceManual?: boolean }
) => void;

/**
 * Defines the options that must be passed from the UI layer to the search function.
 * This pattern keeps the service decoupled from specific component instances.
 */
export interface SearchOptions {
  openApiKeyModal: () => void;
  handleAiAction: AiActionHandler;
}

// =================================================================================
// COMMAND GETTERS
// These functions are EXPORTED to maintain compatibility with other views like
// MainView.svelte and AiView.svelte, which use them directly.
// =================================================================================

/**
 * Retrieves the list of primary commands.
 * @param openApiKeyModal - A callback function to open the API Key modal.
 * @param ttsStatus - The current status of the TTS player (e.g., 'playing', 'stopped').
 * @param isEditorReady - A boolean indicating if the editor instance is available.
 * @returns {Command[]} An array of `Command` objects.
 */
export function getCommands(
  openApiKeyModal: () => void,
  ttsStatus: TTSStatus,
  isEditorReady: boolean
): Command[] {
  const _t = get(t);

  return [
    {
      id: 'search-vault',
      label: _t('command.search_vault'),
      icon: 'search',
      action: () => {
        commandBarStore.setView('search');
      },
    },
    {
      id: 'new-schema',
      label: _t('command.new_schema'),
      icon: 'plus',
      action: () => {
        const parentId = get(commandBarStore).currentParentId;
        documentStore.createNewDocument(
          _t('file_explorer.default_schema_name'),
          undefined,
          parentId
        );
        commandBarStore.close();
      },
    },
    {
      id: 'switch-schema',
      label: _t('command.explore_schemas'),
      icon: 'folder',
      action: () => {
        commandBarStore.setView('list-schemas');
      },
    },
    {
      id: 'study-decks',
      label: _t('command.study_decks'),
      icon: 'book-open',
      action: () => {
        commandBarStore.setView('study-hub');
      },
    },
    {
      id: 'ai-submenu',
      label: _t('command.ai_assistant'),
      icon: 'sparkles',
      action: () => {
        commandBarStore.setView('ai-actions');
      },
    },
    {
      id: 'read-aloud',
      label: _t('command.read_schema'),
      icon: 'volume-2',
      action: () => {
        const editor = get(editorStore).instance;
        if (editor) {
          const nodesToRead = getReadableNodes(editor);
          ttsStore.startReading(nodesToRead);
        } else {
          console.error(
            "Command 'read-aloud': Editor instance is not available."
          );
          // NOTE: A toast for "editor not ready" doesn't exist yet in the provided en.txt
          // For now, it will fall back to the key name. Add `common.editor_not_ready` to en.txt if needed.
          toast.error(_t('common.editor_not_ready'));
        }
        commandBarStore.close();
      },
      isEnabled: () => ttsStatus !== 'playing' && isEditorReady,
    },
    {
      id: 'vault-management',
      label: _t('command.vault_management'),
      icon: 'lock',
      action: () => {
        commandBarStore.setView('vault');
      },
    },
    {
      id: 'set-api-key',
      label: _t('command.set_api_key'),
      icon: 'key',
      action: () => {
        openApiKeyModal();
        commandBarStore.close();
      },
    },
    {
      id: 'report-problem',
      label: _t('command.diagnostics_and_error_report'),
      icon: 'help-circle',
      action: () => {
        commandBarStore.openDiagnosticModal();
      },
    },
  ];
}

/**
 * Retrieves the list of AI-specific commands.
 * @param handleAiAction - The orchestrator function from CommandBar to handle AI actions.
 * @param isNodeSelected - A boolean indicating if a node is currently selected in the editor.
 * @returns {Command[]} An array of `Command` objects.
 */
export function getAiCommands(
  handleAiAction: AiActionHandler,
  isNodeSelected: boolean
): Command[] {
  const _t = get(t);

  return [
    {
      id: 'create-schema-from-text',
      label: _t('command.create_schema_from_text'),
      icon: 'sparkles',
      action: (event) => {
        handleAiAction('create-schema-from-text', {
          forceManual: event?.shiftKey,
        });
      },
    },
    {
      id: 'generate-flashcards-document',
      label: _t('command.generate_study_cards_for_document'),
      icon: 'zap',
      action: () => {
        commandBarStore.openStrategySession();
      },
      isEnabled: () => true,
    },
    {
      id: 'generate-flashcards-node',
      label: _t('command.generate_study_cards_for_node'),
      icon: 'zap',
      action: (event) => {
        handleAiAction('generate-flashcards-node', {
          forceManual: event?.shiftKey,
        });
      },
      isEnabled: () => isNodeSelected,
    },
    {
      id: 'expand-node',
      label: _t('command.expand_this_node'),
      icon: 'plus',
      action: (event) => {
        handleAiAction('expand-node', { forceManual: event?.shiftKey });
      },
      isEnabled: () => isNodeSelected,
    },
  ];
}

// =================================================================================
// UNIFIED SEARCH FUNCTION (For SearchView.svelte)
// This is the main exported function that the omni-search view will use.
// =================================================================================

/**
 * Searches all available commands based on the current application state and a query.
 * @param query The text to search for.
 * @param options An object containing UI-dependent callbacks.
 * @returns A promise that resolves to an array of matching, enabled commands.
 */
export async function searchCommands(
  query: string,
  options: SearchOptions
): Promise<Command[]> {
  // 1. Get current application state from stores
  const ttsStatus = get(ttsStore).status;
  const editorState = get(editorStore);
  const isEditorReady = !!editorState.instance;
  const isNodeSelected = editorState.selectedNode !== null;

  // 2. Generate the full list of commands by calling our own exported functions
  const primaryCommands = getCommands(
    options.openApiKeyModal,
    ttsStatus,
    isEditorReady
  );
  const aiCommands = getAiCommands(options.handleAiAction, isNodeSelected);
  const allAvailableCommands = [...primaryCommands, ...aiCommands];

  const lowerCaseQuery = query.toLowerCase();

  // 3. Filter the generated list
  return allAvailableCommands.filter((command) => {
    // A command is available if its isEnabled function returns true, or if it's not defined
    const isCommandEnabled = command.isEnabled ? command.isEnabled() : true;
    if (!isCommandEnabled) {
      return false;
    }

    // If there's no query, return all enabled commands
    if (!query) {
      return true;
    }

    // Otherwise, filter by matching the label
    return command.label.toLowerCase().includes(lowerCaseQuery);
  });
}
