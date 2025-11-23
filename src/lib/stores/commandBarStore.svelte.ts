/**
 * @file This module is the central hub for controlling the visibility and context of the
 * command bar using Svelte 5 Runes. It acts as a single source of truth and a "micro-router"
 * for navigating between different views within the command bar panel.
 * @store
 */
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { SRS } from '$lib/types';

// --- Type Definitions ---
export type CommandBarView =
  | 'main'
  | 'file-explorer'
  | 'ai-actions'
  | 'study-hub'
  | 'vault'
  | 'deck-options'
  | 'statistics';
export type PasswordModalAction = 'export' | 'import';
export type AiHelperAction =
  | 'create-schema-from-text'
  | 'expand-node'
  | 'generate-flashcards-doc'
  | 'refine-document'
  | 'refine-cards';

export interface StrategySessionContext {
  action: AiHelperAction;
  docId?: string | null;
  node?: ProseMirrorNode;
  nodePos?: number;
  fullDocumentText?: string;
  initialInput?: string;
  fullDocumentJSON?: object;
  selectedCards?: SRS.Card[];
}

export interface CommandBarState {
  isOpen: boolean;
  currentView: CommandBarView;
  viewStack: CommandBarView[];
  isNavigatingBack: boolean;
  viewPayload: any;
  isPasswordModalOpen: boolean;
  passwordModalAction: PasswordModalAction | null;
  isDiagnosticModalOpen: boolean;
  isStrategySessionOpen: boolean;
  strategySessionContext: StrategySessionContext | null;
  // FIX: Add state to track the current folder in the file explorer.
  currentParentId: string | null;
  isSchemaModalOpen: boolean;
  isApiKeyModalOpen: boolean;
}

// --- Initial State and Reactive State Declaration ---
const initialState: CommandBarState = {
  isOpen: false,
  currentView: 'main',
  viewStack: ['main'],
  isNavigatingBack: false,
  viewPayload: null,
  isPasswordModalOpen: false,
  passwordModalAction: null,
  isDiagnosticModalOpen: false,
  isStrategySessionOpen: false,
  strategySessionContext: null,
  // FIX: Add property to initial state.
  currentParentId: null,
  isSchemaModalOpen: false,
  isApiKeyModalOpen: false,
};

export const commandBarState = $state<CommandBarState>({ ...initialState });

// --- Standalone Action Functions ---

/** Opens the command bar. */
export function open(): void {
  commandBarState.isOpen = true;
}

/** Closes the command bar and resets its entire state. */
export function close(): void {
  Object.assign(commandBarState, initialState);
}

/** Toggles the visibility of the command bar. */
export function toggle(): void {
  commandBarState.isOpen = !commandBarState.isOpen;
}

/**
 * Navigates to a new view, pushing it onto the history stack.
 * @param view The view to navigate to.
 * @param payload Optional data to pass to the new view.
 */
export function setView(view: CommandBarView, payload: any = null): void {
  commandBarState.viewStack.push(view);
  commandBarState.currentView = view;
  commandBarState.viewPayload = payload;
  commandBarState.isNavigatingBack = false;
}

/** Navigates back to the previous view in the stack. */
export function goBack(): void {
  if (commandBarState.viewStack.length <= 1) return;
  commandBarState.viewStack.pop();
  const previousView =
    commandBarState.viewStack[commandBarState.viewStack.length - 1];
  commandBarState.currentView = previousView;
  commandBarState.isNavigatingBack = true;
}

/** Explicitly resets the view to main, clearing history. */
export function resetView(): void {
  commandBarState.currentView = 'main';
  commandBarState.viewStack = ['main'];
  commandBarState.viewPayload = null;
  commandBarState.isNavigatingBack = false;
}

/** FIX: Add a new action function to update the currentParentId. */
export function setCurrentParentId(parentId: string | null): void {
  commandBarState.currentParentId = parentId;
}

/** Opens the AI strategy session modal and closes the command bar. */
export function openStrategySession(context: StrategySessionContext): void {
  commandBarState.isOpen = false;
  commandBarState.isStrategySessionOpen = true;
  commandBarState.strategySessionContext = context;
}

/** Closes the AI strategy session modal. */
export function closeStrategySession(): void {
  commandBarState.isStrategySessionOpen = false;
  commandBarState.strategySessionContext = null;
}

/** Opens the password modal for a specific action and closes the command bar. */
export function openPasswordModal(action: PasswordModalAction): void {
  commandBarState.isOpen = false;
  commandBarState.isPasswordModalOpen = true;
  commandBarState.passwordModalAction = action;
}

/** Closes the password modal. */
export function closePasswordModal(): void {
  commandBarState.isPasswordModalOpen = false;
}

/** Opens the diagnostic modal and closes the command bar. */
export function openDiagnosticModal(): void {
  commandBarState.isOpen = false;
  commandBarState.isDiagnosticModalOpen = true;
}

/** Closes the diagnostic modal. */
export function closeDiagnosticModal(): void {
  commandBarState.isDiagnosticModalOpen = false;
}

/** Opens the schema creation modal (used for onboarding demo). */
export function openSchemaModal(): void {
  commandBarState.isOpen = false;
  commandBarState.isSchemaModalOpen = true;
}

/** Closes the schema creation modal. */
export function closeSchemaModal(): void {
  commandBarState.isSchemaModalOpen = false;
}

/** Opens the API Key modal. */
export function openApiKeyModal(): void {
  commandBarState.isOpen = false;
  commandBarState.isApiKeyModalOpen = true;
}

/** Closes the API Key modal. */
export function closeApiKeyModal(): void {
  commandBarState.isApiKeyModalOpen = false;
}

// --- Action Registration ---
import { actionRegistry } from '$lib/actions/registry';
import { gett } from '$lib/utils/i18n';

function registerCommandBarActions() {
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
        // const parentId = commandBarState.viewPayload?.parentId || null;
        // openSchemaModal(); // This handles creation via modal
        openSchemaModal();
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
      // We can add isEnabled check if needed, but for now let's keep it simple
      // isEnabled: () => !!editorState.instance
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

registerCommandBarActions();
