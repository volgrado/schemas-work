/**
 * @file Manages the global state for the command bar and all related UI modals.
 *
 * @remarks
 * This Svelte store acts as the central nervous system for the application's command-driven
 * interactions and modal dialogs. It is responsible for a wide range of UI state management,
 * including:
 * - The visibility (`isOpen`) and current view (`currentView`) of the main command bar.
 * - Orchestrating the display of various modal dialogs, such as the password prompt
 *   for vault import/export operations, the multi-purpose AI helper, and the error
 *   diagnostics viewer.
 *
 * By centralizing this state, the store effectively decouples UI components from one another.
 * For instance, a command executed from the `CommandBar.svelte` component can trigger the
 * opening of the `AIHelperModal.svelte` by simply calling an action on this store,
 * without needing any direct reference or component-to-component binding. This promotes a clean,
 * event-driven architecture and simplifies state management across the application.
 */

import { writable } from 'svelte/store';

/**
 * Defines the possible views or panes that can be displayed within the command bar UI.
 * - `main`: The default view showing primary application commands.
 * - `list-schemas`: A view for browsing, searching, and selecting schema documents and folders.
 * - `ai-actions`: A view dedicated to AI-powered commands like generation and expansion.
 */
export type CommandBarView = 'main' | 'list-schemas' | 'ai-actions';

/**
 * Defines the vault-related actions (`export` or `import`) that require a password.
 * This determines the behavior and labels shown in the password modal.
 */
export type PasswordModalAction = 'export' | 'import';

/**
 * Defines the specific AI-powered helper actions that can be triggered from the command bar.
 * This determines which UI and logic the AI Helper modal will use.
 */
export type AiHelperAction =
  | 'create-schema-from-text'
  | 'generate-flashcards'
  | 'expand-node';

/**
 * Represents the complete state of the command bar and all related modal dialogs.
 */
export interface CommandBarState {
  /** Determines whether the main command bar UI is currently visible. */
  isOpen: boolean;
  /** Specifies the current view or pane being displayed within the command bar (e.g., main commands, schema list). */
  currentView: CommandBarView;
  /** Determines whether the password input modal for vault operations is visible. */
  isPasswordModalOpen: boolean;
  /** Stores the action (`export` or `import`) that triggered the password modal to configure its behavior. */
  passwordModalAction: PasswordModalAction;
  /** Determines whether the AI helper modal is visible. */
  isAiHelperOpen: boolean;
  /** Stores the specific AI action being performed (if any) to configure the modal's content. */
  aiHelperAction: AiHelperAction | null;
  /** Determines whether the error and diagnostics modal is visible. */
  isDiagnosticModalOpen: boolean;
  /** When browsing schemas, this stores the ID of the parent folder, used for creating new items in the correct location. */
  currentParentId: string | null;
}

/**
 * The initial, default state for the command bar store when the application loads or the bar is closed.
 * @internal
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
 * A factory function that creates the command bar store, encapsulating its state and all related actions.
 * This pattern ensures that all logic is co-located and that the store's public interface is clearly defined.
 * @internal
 */
function createCommandBarStore() {
  const { subscribe, set, update } = writable<CommandBarState>(initialState);

  return {
    subscribe,

    /** Opens the command bar and resets it to the default main view. */
    open: () => set({ ...initialState, isOpen: true }),

    /** Closes the command bar and all associated modals, resetting the entire state to its initial default values. */
    close: () => set(initialState),

    /** Toggles the visibility of the command bar. If it was closed, it opens it; otherwise, it closes it. */
    toggle: () =>
      update((state) => {
        // If currently closed, open it to the default state; otherwise, close everything.
        if (!state.isOpen) {
          return { ...initialState, isOpen: true };
        }
        return initialState;
      }),

    /**
     * Sets the active view within the command bar UI.
     * @param view The view to display (e.g., 'main', 'list-schemas').
     */
    setView: (view: CommandBarView) => {
      update((state) => ({ ...state, currentView: view }));
    },

    /**
     * Sets the parent folder ID, used when creating new documents from the schema list view.
     * @param id The unique identifier of the current parent folder being viewed.
     */
    setCurrentParentId: (id: string | null) => {
      update((state) => ({ ...state, currentParentId: id }));
    },

    /**
     * Closes the main command bar and opens the password modal for a specified vault action.
     * @param action The action requiring a password ('export' or 'import').
     */
    openPasswordModal: (action: PasswordModalAction) => {
      update((state) => ({
        ...state,
        isOpen: false, // Ensure main command bar is closed
        isPasswordModalOpen: true,
        passwordModalAction: action,
      }));
    },

    /** Closes the password modal. */
    closePasswordModal: () => {
      update((state) => ({ ...state, isPasswordModalOpen: false }));
    },

    /**
     * Closes the main command bar and opens the AI helper modal for a specified action.
     * @param action The AI-powered action to be performed.
     */
    openAiHelper: (action: AiHelperAction) => {
      update((state) => ({
        ...state,
        isOpen: false, // Ensure main command bar is closed
        isAiHelperOpen: true,
        aiHelperAction: action,
      }));
    },

    /** Closes the AI helper modal and resets the associated action state. */
    closeAiHelper: () => {
      update((state) => ({
        ...state,
        isAiHelperOpen: false,
        aiHelperAction: null,
      }));
    },

    /** Closes the main command bar and opens the diagnostics and error reporting modal. */
    openDiagnosticModal: () => {
      update((state) => ({
        ...state,
        isOpen: false, // Ensure main command bar is closed
        isDiagnosticModalOpen: true,
      }));
    },

    /** Closes the diagnostics modal. */
    closeDiagnosticModal: () => {
      update((state) => ({ ...state, isDiagnosticModalOpen: false }));
    },
  };
}

/**
 * The singleton instance of the command bar store.
 * This provides a centralized and consistent interface for managing all command-related
 * and modal UI state throughout the entire application.
 */
export const commandBarStore = createCommandBarStore();
