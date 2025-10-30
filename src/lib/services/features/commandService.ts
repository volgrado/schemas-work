/**
 * @file commandService.ts
 * @description This service is responsible for defining and managing all the commands
 * available in the application's command bar. It acts as a centralized registry for actions
 * that the user can perform, from creating new documents to interacting with AI features.
 */

import type { Command } from '$lib/types';
import { get } from 'svelte/store';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { documentStore } from '$lib/stores/documentStore';
import { editorStore } from '$lib/stores/editorStore';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';
import { t } from '$lib/utils/i18n';
import { toast } from 'svelte-sonner'; // Import toast for user feedback

// --- FIX APPLIED: Import the utility function to get nodes from the editor ---
import { getReadableNodes } from '$lib/utils/ttsUtils';

/**
 * Retrieves the list of primary commands available in the command bar.
 * These are the general-purpose commands that are typically always available.
 * @returns {Command[]} An array of `Command` objects.
 */
export function getCommands(): Command[] {
  return [
    {
      id: 'new-schema',
      label: get(t)('command.new_schema'),
      icon: 'plus',
      action: () => {
        const parentId = get(commandBarStore).currentParentId;
        documentStore.createNewDocument(
          get(t)('file_explorer.default_schema_name'),
          undefined,
          parentId
        );
        commandBarStore.close();
      },
    },
    {
      id: 'switch-schema',
      label: get(t)('command.explore_schemas'),
      icon: 'folder',
      action: () => {
        commandBarStore.setView('list-schemas');
      },
    },
    {
      id: 'study-decks',
      label: get(t)('command.study_decks'),
      icon: 'book-open',
      action: () => {
        commandBarStore.setView('study-hub');
      },
    },
    {
      id: 'ai-submenu',
      label: get(t)('command.ai_assistant'),
      icon: 'sparkles',
      action: () => {
        commandBarStore.setView('ai-actions');
      },
    },
    {
      id: 'read-aloud',
      label: get(t)('command.read_schema'),
      icon: 'volume-2',
      action: () => {
        // --- FIX APPLIED HERE ---
        // 1. Get the current editor instance from the store.
        const editor = get(editorStore).instance;

        // 2. Guard against the editor not being ready.
        if (editor) {
          // 3. Use our utility to parse the editor's content into readable nodes.
          const nodesToRead = getReadableNodes(editor);

          // 4. Pass the prepared nodes to the ttsStore. This resolves the error.
          ttsStore.startReading(nodesToRead);
        } else {
          // It's good practice to log an error and inform the user.
          console.error(
            "Command 'read-aloud': Editor instance is not available."
          );
          toast.error(get(t)('common.editor_not_ready'));
        }

        commandBarStore.close();
      },
      // Polished: Also disable the command if there is no active editor instance.
      isEnabled: () =>
        get(ttsStore).status !== 'playing' && !!get(editorStore).instance,
    },
    {
      id: 'vault-management',
      label: get(t)('command.vault_management'),
      icon: 'lock',
      action: () => {
        commandBarStore.setView('vault');
      },
    },
    {
      id: 'report-problem',
      label: get(t)('command.diagnostics_and_error_report'),
      icon: 'help-circle',
      action: () => {
        commandBarStore.openDiagnosticModal();
      },
    },
  ];
}

/**
 * Retrieves the list of AI-specific commands.
 * These commands are typically housed in a submenu and are often context-dependent.
 * @returns {Command[]} An array of `Command` objects.
 */
export function getAiCommands(): Command[] {
  const isNodeSelected = get(editorStore).selectedNodePos !== null;

  return [
    {
      id: 'create-schema-from-text',
      label: get(t)('command.create_schema_from_text'),
      icon: 'sparkles',
      action: () => {
        commandBarStore.openAiHelper('create-schema-from-text');
      },
    },
    {
      id: 'generate-flashcards',
      label: get(t)('command.generate_study_cards'),
      icon: 'zap',
      action: () => {
        commandBarStore.openAiHelper('generate-flashcards');
      },
      // This command is only enabled if a node is selected in the editor.
      isEnabled: () => isNodeSelected,
    },
    {
      id: 'expand-node',
      label: get(t)('command.expand_this_node'),
      icon: 'plus',
      action: () => {
        commandBarStore.openAiHelper('expand-node');
      },
      // This command is only enabled if a node is selected in the editor.
      isEnabled: () => isNodeSelected,
    },
  ];
}
