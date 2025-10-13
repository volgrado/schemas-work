import { writable, get } from 'svelte/store';

// --- 1. Definir los posibles estados y vistas ---
/**
 * Defines the possible views within the command bar.
 */
export type CommandBarView = 'main' | 'list-schemas' | 'ai-actions';

/**
 * Defines the actions that can trigger the password modal.
 */
export type PasswordModalAction = 'export' | 'import';

/**
 * Defines the available AI-powered helper actions.
 */
export type AiHelperAction =
  | 'create-schema-from-text'
  | 'generate-flashcards'
  | 'expand-node';

/**
 * Represents the complete state of the command bar and its related modals.
 */
export interface CommandBarState {
  isOpen: boolean;
  currentView: CommandBarView;
  isPasswordModalOpen: boolean;
  passwordModalAction: PasswordModalAction;
  isAiHelperOpen: boolean;
  aiHelperAction: AiHelperAction | null;
  isDiagnosticModalOpen: boolean;
  /** The ID of the folder currently being viewed in the file explorer. */
  currentParentId: string | null;
}

/**
 * The initial state for the command bar store.
 */
const initialState: CommandBarState = {
  isOpen: false,
  currentView: 'main',
  isPasswordModalOpen: false,
  passwordModalAction: 'export',
  isAiHelperOpen: false,
  aiHelperAction: null,
  isDiagnosticModalOpen: false,
  currentParentId: null,
};

/**
 * Creates and manages the command bar's state.
 * @returns A store object with methods to manipulate the command bar state.
 */
function createCommandBarStore() {
  const { subscribe, set, update } = writable<CommandBarState>(initialState);

  return {
    subscribe,

    // --- Main Visibility Actions ---
    /** Opens the command bar to the main view. */
    open: () => set({ ...initialState, isOpen: true }),
    /** Closes the command bar and all related modals, resetting the state. */
    close: () => set(initialState),
    /** Toggles the visibility of the command bar. */
    toggle: () =>
      update((state) => {
        if (!state.isOpen) {
          return { ...initialState, isOpen: true };
        }
        return initialState;
      }),

    // --- Internal State Management Actions ---
    /**
     * Sets the current view of the command bar.
     * @param {CommandBarView} view - The view to display.
     */
    setView: (view: CommandBarView) => {
      update((state) => ({ ...state, currentView: view }));
    },

    /**
     * Allows FileExplorerView to update the global context.
     * @param {string | null} id - The ID of the current parent folder.
     */
    setCurrentParentId: (id: string | null) => {
      update((state) => ({ ...state, currentParentId: id }));
    },

    /**
     * Opens the password modal for a specific action.
     * @param {PasswordModalAction} action - The action requiring a password.
     */
    openPasswordModal: (action: PasswordModalAction) => {
      update((state) => ({
        ...state,
        isOpen: false,
        isPasswordModalOpen: true,
        passwordModalAction: action,
      }));
    },
    /** Closes the password modal. */
    closePasswordModal: () => {
      update((state) => ({ ...state, isPasswordModalOpen: false }));
    },

    /**
     * Opens the AI helper for a specific action.
     * @param {AiHelperAction} action - The AI action to perform.
     */
    openAiHelper: (action: AiHelperAction) => {
      update((state) => ({
        ...state,
        isOpen: false,
        isAiHelperOpen: true,
        aiHelperAction: action,
      }));
    },
    /** Closes the AI helper. */
    closeAiHelper: () => {
      update((state) => ({
        ...state,
        isAiHelperOpen: false,
        aiHelperAction: null,
      }));
    },

    /** Opens the diagnostic data modal. */
    openDiagnosticModal: () => {
      update((state) => ({
        ...state,
        isOpen: false,
        isDiagnosticModalOpen: true,
      }));
    },
    /** Closes the diagnostic data modal. */
    closeDiagnosticModal: () => {
      update((state) => ({ ...state, isDiagnosticModalOpen: false }));
    },
  };
}

/**
 * The exported command bar store instance.
 */
export const commandBarStore = createCommandBarStore();
