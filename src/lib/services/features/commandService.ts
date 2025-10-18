import type { Command } from '$lib/types';
import { get } from 'svelte/store';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { documentStore } from '$lib/stores/documentStore';
import { editorStore } from '$lib/stores/editorStore';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';
import { t } from '$lib/services/i18n';

export function getCommands(): Command[] {
  return [
    {
      id: 'new-schema',
      label: get(t)('command.new_schema'),
      icon: 'plus',
      action: () => {
        const parentId = get(commandBarStore).currentParentId;
        documentStore.createNewDocument('New Schema', undefined, parentId);
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
      id: 'ai-submenu',
      label: get(t)('command.ai_assistant'),
      icon: 'sparkles',
      action: () => {
        commandBarStore.setView('ai-actions');
      },
    },
    {
      id: 'start-review',
      label: get(t)('command.start_review'),
      icon: 'zap',
      action: () => {
        reviewStore.startReview();
        commandBarStore.close();
      },
      isEnabled: () => !get(reviewStore).isReviewing,
    },
    {
      id: 'read-aloud',
      label: get(t)('command.read_schema'),
      icon: 'volume-2',
      action: () => {
        ttsStore.startReading();
        commandBarStore.close();
      },
      isEnabled: () => get(ttsStore).status !== 'playing',
    },
    {
      id: 'export-vault',
      label: get(t)('command.export_vault'),
      icon: 'download-cloud',
      action: () => {
        commandBarStore.openPasswordModal('export');
      },
    },
    {
      id: 'import-vault',
      label: get(t)('command.import_vault'),
      icon: 'upload-cloud',
      action: () => {
        commandBarStore.openPasswordModal('import');
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
      isEnabled: () => isNodeSelected,
    },
    {
      id: 'expand-node',
      label: get(t)('command.expand_this_node'),
      icon: 'plus',
      action: () => {
        commandBarStore.openAiHelper('expand-node');
      },
      isEnabled: () => isNodeSelected,
    },
  ];
}
