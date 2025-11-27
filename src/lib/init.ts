import { actionRegistry } from '$lib/actions/registry';
import { close, setView, openDiagnosticModal, openApiKeyModal } from '$lib/modules/command-bar/ui/commandBarStore.svelte';
import { i18n } from '$lib/utils/i18n.svelte';

export function registerCommandBarActions() {
  const t = i18n.t;

  const actions = [
    // --- Navigation Actions ---
    {
      id: 'app.newSchema',
      title: t('command.new_schema'),
      description: t('command.new_schema'), // Reusing title as description for now or add specific key
      icon: 'plus',
      context: 'view:command-bar',
      handler: async () => {
        const { create } = await import('$lib/stores/documentStore.svelte');
        const { get } = await import('svelte/store');
        
        const defaultName = t('file_explorer.default_schema_name');
        await create(defaultName);
        close();
      }
    },
    {
      id: 'app.switchSchema',
      title: t('command.explore_schemas'),
      description: t('command.explore_schemas'),
      icon: 'folder',
      context: 'view:command-bar',
      handler: () => setView('file-explorer')
    },
    {
      id: 'app.studyDecks',
      title: t('command.study_decks'),
      description: t('command.study_decks'),
      icon: 'book-open',
      context: 'view:command-bar',
      handler: () => setView('study-hub')
    },
    {
      id: 'app.aiSubmenu',
      title: t('command.ai_assistant'),
      description: t('command.ai_assistant'),
      icon: 'sparkles',
      context: 'view:command-bar',
      handler: () => setView('ai-actions')
    },
    {
      id: 'app.vaultManagement',
      title: t('command.vault_management'),
      description: t('command.vault_management'),
      icon: 'lock',
      context: 'view:command-bar',
      handler: () => setView('vault')
    },
    
    // --- Feature Actions ---
    {
      id: 'app.readAloud',
      title: t('command.read_schema'),
      description: t('command.read_schema'),
      icon: 'volume-2',
      context: 'view:command-bar',
      handler: async () => {
        const { editorState } = await import('$lib/modules/editor/ui/editorStore.svelte');
        const { startReading } = await import('$lib/modules/tts/ui/ttsStore.svelte');
        const { getReadableNodes } = await import('$lib/modules/tts/infra/ttsUtils');
        const { toast } = await import('svelte-sonner');
        
        const editor = editorState.instance;
        if (editor) {
           editor.chain().focus().ensureNodeIds().run();
           const nodesToRead = getReadableNodes(editor);
           startReading(nodesToRead);
           close();
        } else {
           toast.error(t('common.editor_not_ready'));
        }
      }
    },
    {
      id: 'app.openDiagnosticModal',
      title: t('command.diagnostics_and_error_report'),
      description: t('command.diagnostics_and_error_report'),
      icon: 'activity',
      context: 'view:command-bar',
      handler: () => openDiagnosticModal()
    },
    {
      id: 'app.openApiKeyModal',
      title: t('command.set_api_key'),
      description: t('command.set_api_key'),
      icon: 'key',
      context: 'view:command-bar',
      handler: () => openApiKeyModal()
    }
  ];

  actions.forEach(action => actionRegistry.register(action as any));
}
