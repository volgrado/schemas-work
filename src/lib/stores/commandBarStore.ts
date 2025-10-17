/**
 * @file Manages the global state for the command bar and related UI modals.
 * @module commandBarStore
 */

import { writable } from 'svelte/store';

/**
 * Defines the possible views that can be displayed within the command bar.
 */
export type CommandBarView = 'main' | 'list-schemas' | 'ai-actions';

/**
 * Defines the vault-related actions that require a password.
 */
export type PasswordModalAction = 'export' | 'import';

/**
 * Defines the AI-powered helper actions that can be triggered.
 */
export type AiHelperAction =
	| 'create-schema-from-text'
	| 'generate-flashcards'
	| 'expand-node';

/**
 * Represents the complete state of the command bar and all related modal dialogs.
 */
export interface CommandBarState {
	/** Whether the main command bar UI is visible. */
	isOpen: boolean;
	/** The current view being displayed within the command bar. */
	currentView: CommandBarView;
	/** Whether the password input modal for vault operations is visible. */
	isPasswordModalOpen: boolean;
	/** The action (`export` or `import`) that triggered the password modal. */
	passwordModalAction: PasswordModalAction;
	/** Whether the AI helper modal is visible. */
	isAiHelperOpen: boolean;
	/** The specific AI action being performed. */
	aiHelperAction: AiHelperAction | null;
	/** Whether the error and diagnostics modal is visible. */
	isDiagnosticModalOpen: boolean;
	/** The ID of the parent folder when browsing schemas. */
	currentParentId: string | null;
}

/**
 * The initial state for the command bar store.
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
	currentParentId: null
};

/**
 * Creates the command bar store, encapsulating its state and actions.
 * @internal
 */
function createCommandBarStore() {
	const { subscribe, set, update } = writable<CommandBarState>(initialState);

	return {
		subscribe,

		/** Opens the command bar to the default main view. */
		open: () => set({ ...initialState, isOpen: true }),

		/** Closes the command bar and all modals, resetting the state. */
		close: () => set(initialState),

		/** Toggles the visibility of the command bar. */
		toggle: () =>
			update((state) => {
				if (!state.isOpen) {
					return { ...initialState, isOpen: true };
				}
				return initialState;
			}),

		/**
		 * Sets the active view within the command bar.
		 * @param view The view to display.
		 */
		setView: (view: CommandBarView) => {
			update((state) => ({ ...state, currentView: view }));
		},

		/**
		 * Sets the parent folder ID for creating new documents.
		 * @param id The unique ID of the current parent folder.
		 */
		setCurrentParentId: (id: string | null) => {
			update((state) => ({ ...state, currentParentId: id }));
		},

		/**
		 * Opens the password modal for a specified vault action.
		 * @param action The action requiring a password.
		 */
		openPasswordModal: (action: PasswordModalAction) => {
			update((state) => ({
				...state,
				isOpen: false,
				isPasswordModalOpen: true,
				passwordModalAction: action
			}));
		},

		/** Closes the password modal. */
		closePasswordModal: () => {
			update((state) => ({ ...state, isPasswordModalOpen: false }));
		},

		/**
		 * Opens the AI helper modal for a specified action.
		 * @param action The AI-powered action to perform.
		 */
		openAiHelper: (action: AiHelperAction) => {
			update((state) => ({
				...state,
				isOpen: false,
				isAiHelperOpen: true,
				aiHelperAction: action
			}));
		},

		/** Closes the AI helper modal. */
		closeAiHelper: () => {
			update((state) => ({
				...state,
				isAiHelperOpen: false,
				aiHelperAction: null
			}));
		},

		/** Opens the diagnostics and error reporting modal. */
		openDiagnosticModal: () => {
			update((state) => ({
				...state,
				isOpen: false,
				isDiagnosticModalOpen: true
			}));
		},

		/** Closes the diagnostics modal. */
		closeDiagnosticModal: () => {
			update((state) => ({ ...state, isDiagnosticModalOpen: false }));
		}
	};
}

/**
 * The singleton instance of the command bar store.
 */
export const commandBarStore = createCommandBarStore();
