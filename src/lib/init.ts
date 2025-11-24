import { actionRegistry } from '$lib/actions/registry';
import { close, setView, openDiagnosticModal, openApiKeyModal } from '$lib/stores/commandBarStore.svelte';

export function registerCommandBarActions() {
  const actions = [
    // --- Navigation Actions ---
    {
      id: 'app.newSchema',
      title: 'New Schema',
      description: 'Create a new schema document.',
      icon: 'plus',
      context: 'view:command-bar',
      handler: async () => {
        const { create } = await import('$lib/stores/documentStore.svelte');
        const { get } = await import('svelte/store');
        const { t } = await import('$lib/utils/i18n');
        
        const defaultName = get(t)('file_explorer.default_schema_name');
        await create(defaultName);
        close();
      }
    },
    {
      id: 'app.switchSchema',
      title: 'Explore Schemas',
      description: 'Browse and switch between schemas.',
      icon: 'folder',
      context: 'view:command-bar',
      handler: () => setView('file-explorer')
    },
    {
      id: 'app.studyDecks',
      title: 'Study Decks',
      description: 'Review your flashcard decks.',
      icon: 'book-open',
      context: 'view:command-bar',
      handler: () => setView('study-hub')
    },
    {
      id: 'app.aiSubmenu',
      title: 'AI Assistant',
      description: 'Access AI-powered tools.',
      icon: 'sparkles',
      context: 'view:command-bar',
      handler: () => setView('ai-actions')
    },
    {
      id: 'app.vaultManagement',
      title: 'Vault Management',
      description: 'Manage your secure vault.',
      icon: 'lock',
      context: 'view:command-bar',
      handler: () => setView('vault')
    },
    
    // --- Feature Actions ---
    {
      id: 'app.readAloud',
      title: 'Read Schema',
      description: 'Listen to the current schema.',
      icon: 'volume-2',
      context: 'view:command-bar',
      handler: async () => {
        const { editorState } = await import('$lib/stores/editorStore.svelte');
        const { startReading } = await import('$lib/stores/ttsStore.svelte');
        const { getReadableNodes } = await import('$lib/utils/ttsUtils');
        const { toast } = await import('svelte-sonner');
        
        const editor = editorState.instance;
        if (editor) {
           editor.chain().focus().ensureNodeIds().run();
           const nodesToRead = getReadableNodes(editor);
           startReading(nodesToRead);
           close();
        } else {
           toast.error('Editor not ready');
        }
      }
    },
    {
      id: 'app.openDiagnosticModal',
      title: 'System Diagnostics',
      description: 'View system health and logs.',
      icon: 'activity',
      context: 'view:command-bar',
      handler: () => openDiagnosticModal()
    },
    {
      id: 'app.openApiKeyModal',
      title: 'API Keys',
      description: 'Manage your API keys.',
      icon: 'key',
      context: 'view:command-bar',
      handler: () => openApiKeyModal()
    }
  ];

  actions.forEach(action => actionRegistry.register(action as any));
}
