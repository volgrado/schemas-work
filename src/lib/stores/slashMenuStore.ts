/**
 * @file Manages the state and interactions for the editor's slash command menu.
 *
 * @remarks
 * This Svelte store is exclusively dedicated to controlling the behavior and state of the pop-up menu
 * that appears within the Tiptap editor when the user types the `/` character. Its core
 * responsibilities are:
 * - Tracking the menu's visibility (`isOpen`).
 * - Managing the complete list of available commands (`allItems`) and the currently
 *   visible, filtered subset (`filteredItems`) based on the user's query.
 * - Handling all user navigation within the menu, including moving up/down through the items
 *   and switching between different command groups (e.g., "Formatting", "Insert").
 * - Storing a reference to the `commandToExecute` function, which is provided by the Tiptap
 *   `SlashCommands` extension. This function is responsible for actually running the selected command.
 * - Keeping track of the menu's on-screen position via the `clientRect`.
 *
 * This store serves as the primary communication channel and state manager, decoupling the
 * Tiptap `SlashCommands` extension (which provides the raw data and logic) from the
 * `SlashMenu.svelte` component (which is responsible for rendering the UI).
 */

import { writable } from 'svelte/store';
import type { CommandItem } from '$lib/editor/slashCommands';

/**
 * Defines the complete shape of the state for the slash command menu.
 */
interface SlashMenuState {
  /** Determines whether the slash command menu is currently visible. */
  isOpen: boolean;
  /** The complete, unfiltered list of all available command items provided by the extension. */
  allItems: CommandItem[];
  /** The filtered list of items currently displayed, based on the active group and the user's query. */
  filteredItems: CommandItem[];
  /** An array of unique group names derived from `allItems` (e.g., "Formatting", "Insert", "AI"). */
  groups: string[];
  /** The index of the currently active group within the `groups` array, determining which items are shown. */
  activeGroupIndex: number;
  /** The index of the currently selected (highlighted) item within the `filteredItems` array. */
  selectedIndex: number;
  /** A function that returns the DOMRect of the text cursor, used for precisely positioning the menu pop-up. */
  clientRect: (() => DOMRect | null) | null;
  /** The callback function, provided by the Tiptap extension, to execute when a command is selected by the user. */
  commandToExecute: ((item: CommandItem) => void) | null;
  /** The user's input text after the `/` character, used for filtering the command list. */
  query: string;
}

/**
 * The initial, default state of the slash menu store, representing a closed menu.
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
  query: '',
};

/**
 * A factory function that creates the slash menu store, neatly encapsulating its state and all related actions.
 * @internal
 */
function createSlashMenuStore() {
  const { subscribe, update, set } = writable<SlashMenuState>(initialState);

  /** A helper to filter the `allItems` based on the `activeGroupIndex` and update the state accordingly. */
  const filterAndSetItems = (state: SlashMenuState): SlashMenuState => {
    const activeGroup = state.groups[state.activeGroupIndex];
    const filteredItems = state.allItems.filter((item) => item.group === activeGroup);
    // Always reset the selection index when the group changes to avoid out-of-bounds errors.
    return { ...state, filteredItems, selectedIndex: 0 };
  };

  return {
    subscribe,

    /** Opens the slash command menu with a given set of items and configuration from the Tiptap extension. */
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
        query,
      });
      set(newState);
    },

    /** Closes the menu and resets its state completely to the initial default. */
    close: () => set(initialState),

    /** Updates the list of items, typically in response to the user typing and filtering the results. */
    updateItems: (newItems: CommandItem[], query: string) => {
      update((state) => {
        const groups = [...new Set(newItems.map((item) => item.group))];
        // Ensure the active group index remains valid if the number of groups changes.
        const activeGroupIndex = state.activeGroupIndex >= groups.length ? 0 : state.activeGroupIndex;
        const newState = filterAndSetItems({ ...state, allItems: newItems, groups, activeGroupIndex, query });
        return newState;
      });
    },

    /** Moves the selection highlight up or down within the currently displayed `filteredItems`. */
    moveSelection: (direction: 1 | -1) => {
      update((state) => {
        if (state.filteredItems.length === 0) return state;
        const newIndex = (state.selectedIndex + state.filteredItems.length + direction) % state.filteredItems.length;
        return { ...state, selectedIndex: newIndex };
      });
    },

    /** Switches to the next or previous group of commands (e.g., using arrow keys), wrapping around if necessary. */
    moveGroup: (direction: 1 | -1) => {
      update((state) => {
        if (state.groups.length <= 1) return state;
        const newIndex = (state.activeGroupIndex + state.groups.length + direction) % state.groups.length;
        // The helper function will handle updating the filtered list and resetting the selection index.
        return filterAndSetItems({ ...state, activeGroupIndex: newIndex });
      });
    },

    /** Sets the active group directly by its index, usually triggered by hovering over a group tab. */
    setActiveGroup: (index: number) => {
      update((state) => {
        if (index === state.activeGroupIndex || index >= state.groups.length) return state;
        return filterAndSetItems({ ...state, activeGroupIndex: index });
      });
    },

    /** Executes the currently selected (highlighted) command and then closes the menu. */
    triggerCommand: () => {
      update((state) => {
        const item = state.filteredItems[state.selectedIndex];
        if (item && state.commandToExecute) {
          state.commandToExecute(item);
        }
        return initialState; // Close menu after execution
      });
    },

    /** Executes a specific command by its index in the `filteredItems` list (e.g., on click) and closes the menu. */
    triggerCommandByIndex: (index: number) => {
      update((state) => {
        const item = state.filteredItems[index];
        if (item && state.commandToExecute) {
          state.commandToExecute(item);
        }
        return initialState; // Close menu after execution
      });
    },
  };
}

/**
 * The singleton instance of the slash menu store, providing a centralized interface for managing the menu's state.
 */
export const slashMenuStore = createSlashMenuStore();
