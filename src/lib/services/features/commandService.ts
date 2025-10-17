/**
 * @file Centralizes the definition, logic, and state management of all application commands.
 *
 * @remarks
 * This service is the definitive source of truth for the command bar feature. It decouples
 * the command logic from the UI components by defining a comprehensive list of available
 * `Command` objects. Each command is a self-contained unit with an ID, a user-facing
 * label, an icon, an action to execute, and an optional `isEnabled` function to
 * dynamically determine if it should be active based on the current application state.
 *
 * This architectural pattern provides several key advantages:
 * - **Decoupling & Single Responsibility**: The `CommandBar.svelte` component is only
 *   responsible for rendering the list of commands and dispatching user actions, not for
 *   implementing the command logic itself. This keeps the UI component clean and focused.
 * - **Centralization & Maintainability**: All application-wide commands are defined in this
 *   single location, making them easy to discover, manage, update, and reason about.
 * - **Testability**: Each command's action can be unit-tested in isolation, without needing
 *   to interact with the Svelte component lifecycle or the DOM.
 */

import type { Command } from '$lib/types';
import { get } from 'svelte/store';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { documentStore } from '$lib/stores/documentStore';
import { editorStore } from '$lib/stores/editorStore';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';

/**
 * Retrieves the list of primary commands available in the main view of the command bar.
 *
 * @remarks
 * The availability of certain commands is dynamically determined by reading the current
 * state of the application from various Svelte stores. For example, the "Start Review"
 * command is disabled if a review is already in progress.
 *
 * @returns An array of `Command` objects for the main command bar view.
 */
export function getCommands(): Command[] {
  return [
    {
      id: 'new-schema',
      label: 'New Schema',
      icon: 'plus',
      action: () => {
        // Creates a new schema, correctly parenting it under the currently viewed folder, if any.
        const parentId = get(commandBarStore).currentParentId;
        documentStore.createNewDocument('New Schema', undefined, parentId);
        commandBarStore.close();
      },
    },
    {
      id: 'switch-schema',
      label: 'Explore Schemas...',
      icon: 'folder',
      action: () => {
        // Changes the command bar's view to show the searchable list of schemas and folders.
        commandBarStore.setView('list-schemas');
      },
    },
    {
      id: 'ai-submenu',
      label: 'AI Assistant...',
      icon: 'sparkles',
      action: () => {
        // Navigates to the secondary view containing AI-specific commands.
        commandBarStore.setView('ai-actions');
      },
    },
    {
      id: 'start-review',
      label: 'Start Review',
      icon: 'zap',
      action: () => {
        reviewStore.startReview();
        commandBarStore.close();
      },
      // This command is only enabled if a review session is not already active.
      isEnabled: () => !get(reviewStore).isReviewing,
    },
    {
      id: 'read-aloud',
      label: 'Read Schema',
      icon: 'volume-2',
      action: () => {
        ttsStore.startReading();
        commandBarStore.close();
      },
      // This command is only enabled if the text-to-speech feature is not currently playing.
      isEnabled: () => get(ttsStore).status !== 'playing',
    },
    {
      id: 'export-vault',
      label: 'Export Vault',
      icon: 'download-cloud',
      action: () => {
        // Delegates the export action to the command bar store, which handles the UI flow (e.g., password modal).
        commandBarStore.openPasswordModal('export');
      },
    },
    {
      id: 'import-vault',
      label: 'Import Vault',
      icon: 'upload-cloud',
      action: () => {
        // Delegates the import action to the command bar store for the same reasons.
        commandBarStore.openPasswordModal('import');
      },
    },
    {
      id: 'report-problem',
      label: 'Diagnostics and Error Report',
      icon: 'help-circle',
      action: () => {
        // Opens the diagnostic modal, allowing users to view and report errors.
        commandBarStore.openDiagnosticModal();
      },
    },
  ];
}

/**
 * Retrieves the list of secondary commands specific to the AI Assistant feature.
 *
 * @remarks
 * The availability of these commands often depends on the state of the editor, such as
 * whether a specific node is selected, as this provides the necessary context for the AI.
 *
 * @returns An array of `Command` objects for the AI Assistant command view.
 */
export function getAiCommands(): Command[] {
  const isNodeSelected = get(editorStore).selectedNodePos !== null;

  return [
    {
      id: 'create-schema-from-text',
      label: 'Create Schema from Text...',
      icon: 'sparkles',
      action: () => {
        // Opens the AI helper modal, configured for the schema generation task.
        commandBarStore.openAiHelper('create-schema-from-text');
      },
    },
    {
      id: 'generate-flashcards',
      label: 'Generate Study Cards',
      icon: 'zap',
      action: () => {
        // Opens the AI helper modal for generating flashcards based on the selected node's content.
        commandBarStore.openAiHelper('generate-flashcards');
      },
      // This command is only enabled if a node is currently selected in the editor.
      isEnabled: () => isNodeSelected,
    },
    {
      id: 'expand-node',
      label: 'Expand this node',
      icon: 'plus',
      action: () => {
        // Opens the AI helper modal to expand upon the content of the selected node.
        commandBarStore.openAiHelper('expand-node');
      },
      // This command also requires a node to be selected to provide context.
      isEnabled: () => isNodeSelected,
    },
  ];
}
