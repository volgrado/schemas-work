// src/lib/services/features/commandService.ts

/**
 * @file This service is the heart of the CommandBar.
 * It centralizes the definition of all available commands in the application,
 * decoupling the business logic from the presentation layer (the Svelte component).
 *
 * RESPONSIBILITIES:
 * 1. Define the structure of a command through the `Command` interface.
 * 2. Import the necessary stores and services to execute the actions.
 * 3. Provide functions that return lists of commands (`getCommands`, `getAiCommands`)
 * based on the current state of the application (e.g., if a node is selected).
 *
 * BENEFITS OF THIS ARCHITECTURE:
 * - **Testability:** Each `action` can be unit-tested without rendering the UI.
 * - **Maintainability:** Adding or modifying commands is done in a single place.
 * - **Clarity:** The `CommandBar.svelte` component becomes a "dumb component"
 * focused solely on rendering and delegating events.
 */

import type { Command } from '$lib/types/command';
import { get } from 'svelte/store';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { documentStore } from '$lib/stores/documentStore';
import { editorStore } from '$lib/stores/editorStore';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';

/**
 * Returns the list of commands for the main view of the CommandBar.
 * @returns {Command[]} An array of main commands.
 */
export function getCommands(): Command[] {
  return [
    {
      id: 'new-schema',
      label: 'New Schema',
      icon: 'plus',
      action: () => {
        // --- ✨ MEJORA CLAVE ---
        // Ahora obtenemos el ID de la carpeta actual desde el store.
        // Si el usuario está en la raíz, será `null`, creando el archivo en la raíz.
        // Si está dentro de una carpeta, usará el ID de esa carpeta.
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
        // Instead of handling UI logic here, we tell the store
        // to change its internal view. The component will react to this.
        commandBarStore.setView('list-schemas');
      },
    },
    {
      id: 'ai-submenu',
      label: 'AI Assistant...',
      icon: 'sparkles',
      action: () => {
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
      // The command is disabled if a review is already in progress.
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
      // The command is disabled if it is already reading aloud.
      isEnabled: () => get(ttsStore).status !== 'playing',
    },
    {
      id: 'export-vault',
      label: 'Export Vault',
      icon: 'download-cloud',
      action: () => {
        // The command does not manage the modal directly.
        // It delegates to the store the opening of the modal with the correct action.
        commandBarStore.openPasswordModal('export');
      },
    },
    {
      id: 'import-vault',
      label: 'Import Vault',
      icon: 'upload-cloud',
      action: () => {
        commandBarStore.openPasswordModal('import');
      },
    },
    {
      id: 'report-problem',
      label: 'Diagnostics and Error Report',
      icon: 'help-circle',
      action: () => {
        commandBarStore.openDiagnosticModal();
      },
    },
  ];
}

/**
 * Returns the list of commands for the "AI Assistant" sub-menu.
 * @returns {Command[]} An array of AI commands.
 */
export function getAiCommands(): Command[] {
  // The `isEnabled` check is based on the current state of the `editorStore`.
  const isNodeSelected = get(editorStore).selectedNodePos !== null;

  return [
    {
      id: 'create-schema-from-text',
      label: 'Create Schema from Text...',
      icon: 'sparkles',
      action: () => {
        // Again, we delegate to the store the opening of the AI helper modal.
        commandBarStore.openAiHelper('create-schema-from-text');
      },
    },
    {
      id: 'generate-flashcards',
      label: 'Generate Study Cards',
      icon: 'zap',
      action: () => {
        commandBarStore.openAiHelper('generate-flashcards');
      },
      isEnabled: () => isNodeSelected,
    },
    {
      id: 'expand-node',
      label: 'Expand this node',
      icon: 'plus',
      action: () => {
        commandBarStore.openAiHelper('expand-node');
      },
      isEnabled: () => isNodeSelected,
    },
  ];
}
