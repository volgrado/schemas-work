/**
 * @file Manages the state and interactions for the editor's slash command menu.
 * @module slashMenuStore
 *
 * @remarks
 * This store manages the state for the slash command menu, a floating UI element that appears
 * in the editor when the user types the '/' character. It's responsible for filtering commands
 * based on user input, handling keyboard navigation, and executing the selected command.
 *
 * ### Architectural Role
 *
 * - **Ephemeral UI State Manager**: Unlike stores that manage persistent application data (like
 *   `documentStore`), this store handles purely ephemeral UI state. The menu's entire lifecycle
 *   is fleeting: it opens, the user interacts with it for a few seconds, a command is triggered,
 *   and the state is completely reset. This is a common pattern for managing complex, temporary
 *   UI interactions like command palettes or context menus.
 *
 * - **Decoupling Input from Presentation**: The logic for this store is driven by a Tiptap
 *   extension (`slashCommands/suggestion.ts`). That extension is responsible for detecting when
 *   to open the menu and providing the necessary data (the list of commands, the cursor position,
 *   the user's query). The store takes this data and manages the state, but it has no knowledge
 *   of Tiptap itself. The `SlashMenu.svelte` component, in turn, is a purely presentational
 *   component that subscribes to this store and renders the UI. This creates a clean separation:
 *   `Tiptap Extension (Logic) -> Svelte Store (State) -> Svelte Component (View)`.
 *
 * - **Callback-Based Execution**: The store itself does not know how to execute any of the commands.
 *   When the menu is opened, the Tiptap extension provides a `commandToExecute` callback function.
 *   When a user selects a command, the store simply invokes this callback with the chosen command
 *   item. This is a powerful form of inversion of control that keeps the store generic and reusable,
 *   as the execution logic remains within the Tiptap/ProseMirror ecosystem where it has access to
 *   the editor's transaction model.
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
  allitems: CommandItem[];
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
  allitems: [],
  filteredItems: [],
  groups: [],
  activeGroupIndex: 0,
  selectedIndex: 0,
  clientRect: null,
  commandToExecute: null,
  query: '',
};

/**
 * Creates the slash menu store, encapsulating its state and actions.
 * @internal
 */
function createSlashMenuStore() {
  const { subscribe, update, set } = writable<SlashMenuState>(initialState);

  const filterAndSetItems = (state: SlashMenuState): SlashMenuState => {
    const activeGroup = state.groups[state.activeGroupIndex];
    const filteredItems = state.allitems.filter(
      (item) => item.group === activeGroup
    );
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
        allitems: items,
        groups,
        clientRect,
        commandToExecute: command,
        query,
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
        const activeGroupIndex =
          state.activeGroupIndex >= groups.length ? 0 : state.activeGroupIndex;
        const newState = filterAndSetItems({
          ...state,
          allitems: newItems,
          groups,
          activeGroupIndex,
          query,
        });
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
        const newIndex =
          (state.selectedIndex + state.filteredItems.length + direction) %
          state.filteredItems.length;
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
        const newIndex =
          (state.activeGroupIndex + state.groups.length + direction) %
          state.groups.length;
        return filterAndSetItems({ ...state, activeGroupIndex: newIndex });
      });
    },

    /**
     * Sets the active group by its index.
     * @param index The index of the group to activate.
     */
    setActiveGroup: (index: number) => {
      update((state) => {
        if (index === state.activeGroupIndex || index >= state.groups.length)
          return state;
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
    },
  };
}

/**
 * The singleton instance of the slash menu store.
 */
export const slashMenuStore = createSlashMenuStore();
