/**
 * @file Manages the state and interactions for the editor's slash command menu.
 * @module slashMenuStore
 */

import { writable } from 'svelte/store';
import type { CommandItem } from '$lib/editor/slashCommands';

/**
 * Defines the complete shape of the state for the slash command menu.
 */
interface SlashMenuState {
	/** Determines whether the slash command menu is visible. */
	isOpen: boolean;
	/** The complete, unfiltered list of all available command items. */
	allItems: CommandItem[];
	/** The filtered list of items currently displayed. */
	filteredItems: CommandItem[];
	/** An array of unique group names from `allItems`. */
	groups: string[];
	/** The index of the currently active group in the `groups` array. */
	activeGroupIndex: number;
	/** The index of the currently selected item in the `filteredItems` array. */
	selectedIndex: number;
	/** A function that returns the DOMRect of the text cursor for positioning the menu. */
	clientRect: (() => DOMRect | null) | null;
	/** The callback function to execute when a command is selected. */
	commandToExecute: ((item: CommandItem) => void) | null;
	/** The user's input after the `/` character, used for filtering. */
	query: string;
}

/**
 * The initial state of the slash menu store.
 * @internal
 */
const initialState: SlashMenuState = {
	isOpen: false,
	allItems: [],
	filteredItems: [],
	groups: [],
	activeGroupIndex: 0,
	selectedIndex: 0,
	clientRect: null,
	commandToExecute: null,
	query: ''
};

/**
 * Creates the slash menu store, encapsulating its state and actions.
 * @internal
 */
function createSlashMenuStore() {
	const { subscribe, update, set } = writable<SlashMenuState>(initialState);

	const filterAndSetItems = (state: SlashMenuState): SlashMenuState => {
		const activeGroup = state.groups[state.activeGroupIndex];
		const filteredItems = state.allItems.filter((item) => item.group === activeGroup);
		return { ...state, filteredItems, selectedIndex: 0 };
	};

	return {
		subscribe,

		/**
		 * Opens the slash command menu.
		 * @param items The full list of command items.
		 * @param clientRect Function to get the cursor position.
		 * @param command The function to execute a command.
		 * @param query The user's current query.
		 */
		open: (
			items: CommandItem[],
			clientRect: (() => DOMRect | null) | null,
			command: (item: CommandItem) => void,
			query: string
		) => {
			const groups = [...new Set(items.map((item) => item.group))];
			const newState = filterAndSetItems({
				...initialState,
				isOpen: true,
				allItems: items,
				groups,
				clientRect,
				commandToExecute: command,
				query
			});
			set(newState);
		},

		/** Closes the menu and resets its state. */
		close: () => set(initialState),

		/**
		 * Updates the list of items based on the user's query.
		 * @param newItems The new list of filtered items.
		 * @param query The user's current query.
		 */
		updateItems: (newItems: CommandItem[], query: string) => {
			update((state) => {
				const groups = [...new Set(newItems.map((item) => item.group))];
				const activeGroupIndex = state.activeGroupIndex >= groups.length ? 0 : state.activeGroupIndex;
				const newState = filterAndSetItems({ ...state, allItems: newItems, groups, activeGroupIndex, query });
				return newState;
			});
		},

		/**
		 * Moves the selection highlight up or down.
		 * @param direction The direction to move (-1 for up, 1 for down).
		 */
		moveSelection: (direction: 1 | -1) => {
			update((state) => {
				if (state.filteredItems.length === 0) return state;
				const newIndex = (state.selectedIndex + state.filteredItems.length + direction) % state.filteredItems.length;
				return { ...state, selectedIndex: newIndex };
			});
		},

		/**
		 * Switches to the next or previous group of commands.
		 * @param direction The direction to move (-1 for previous, 1 for next).
		 */
		moveGroup: (direction: 1 | -1) => {
			update((state) => {
				if (state.groups.length <= 1) return state;
				const newIndex = (state.activeGroupIndex + state.groups.length + direction) % state.groups.length;
				return filterAndSetItems({ ...state, activeGroupIndex: newIndex });
			});
		},

		/**
		 * Sets the active group by its index.
		 * @param index The index of the group to activate.
		 */
		setActiveGroup: (index: number) => {
			update((state) => {
				if (index === state.activeGroupIndex || index >= state.groups.length) return state;
				return filterAndSetItems({ ...state, activeGroupIndex: index });
			});
		},

		/** Executes the currently selected command and closes the menu. */
		triggerCommand: () => {
			update((state) => {
				const item = state.filteredItems[state.selectedIndex];
				if (item && state.commandToExecute) {
					state.commandToExecute(item);
				}
				return initialState;
			});
		},

		/**
		 * Executes a specific command by its index and closes the menu.
		 * @param index The index of the command to trigger in `filteredItems`.
		 */
		triggerCommandByIndex: (index: number) => {
			update((state) => {
				const item = state.filteredItems[index];
				if (item && state.commandToExecute) {
					state.commandToExecute(item);
				}
				return initialState;
			});
		}
	};
}

/**
 * The singleton instance of the slash menu store.
 */
export const slashMenuStore = createSlashMenuStore();
