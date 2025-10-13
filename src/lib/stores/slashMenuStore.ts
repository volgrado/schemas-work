// src/lib/stores/slashMenuStore.ts
import { writable } from 'svelte/store';
import type { CommandItem } from '$lib/editor/slashCommands';

/**
 * Defines the shape of the state for the slash command menu.
 */
interface SlashMenuState {
  /** Indicates whether the menu is open. */
  isOpen: boolean;
  /** The list of command items to display. */
  items: CommandItem[];
  /** The index of the currently selected item. */
  selectedIndex: number;
  /** A function that returns the DOMRect of the cursor position. */
  clientRect: (() => DOMRect | null) | null;
  /** The function to execute when a command is selected. */
  commandToExecute: ((item: CommandItem) => void) | null;
}

/**
 * The initial state for the slash menu.
 */
const initialState: SlashMenuState = {
  isOpen: false,
  items: [],
  selectedIndex: 0,
  clientRect: null,
  commandToExecute: null,
};

/**
 * Creates a custom store for managing the state of the slash command menu.
 * @returns A store object with methods to manage the slash menu.
 */
function createSlashMenuStore() {
  const { subscribe, update, set } = writable<SlashMenuState>(initialState);

  return {
    subscribe,

    /**
     * Opens the slash menu with a list of items and a command to execute.
     * @param {CommandItem[]} items - The command items to display.
     * @param {(() => DOMRect | null) | null} clientRect - A function to get the cursor's position.
     * @param {(item: CommandItem) => void} command - The function to call when an item is selected.
     */
    open: (
      items: CommandItem[],
      clientRect: (() => DOMRect | null) | null,
      command: (item: CommandItem) => void,
    ) => {
      update((state) => ({
        ...state,
        isOpen: true,
        items,
        clientRect,
        commandToExecute: command,
        selectedIndex: 0,
      }));
    },

    /**
     * Closes the slash menu and resets its state.
     */
    close: () => {
      set(initialState);
    },

    /**
     * Updates the list of items in the menu.
     * @param {CommandItem[]} newItems - The new list of command items.
     */
    updateItems: (newItems: CommandItem[]) => {
      update((state) => ({
        ...state,
        items: newItems,
        selectedIndex:
          state.selectedIndex >= newItems.length ? 0 : state.selectedIndex,
      }));
    },

    /**
     * Moves the selection up or down the list.
     * @param {1 | -1} direction - The direction to move (-1 for up, 1 for down).
     */
    moveSelection: (direction: 1 | -1) => {
      update((state) => {
        if (state.items.length === 0) return state;
        const newIndex =
          (state.selectedIndex + state.items.length + direction) %
          state.items.length;
        return { ...state, selectedIndex: newIndex };
      });
    },

    /**
     * Executes the currently selected command and closes the menu.
     */
    triggerCommand: () => {
      update((state) => {
        const item = state.items[state.selectedIndex];
        if (item && state.commandToExecute) {
          state.commandToExecute(item);
        }
        return initialState; // Close the menu after execution
      });
    },

    /**
     * Executes a command by its index and closes the menu.
     * @param {number} index - The index of the command to trigger.
     */
    triggerCommandByIndex: (index: number) => {
      update((state) => {
        const item = state.items[index];
        if (item && state.commandToExecute) {
          state.commandToExecute(item);
        }
        return initialState; // Close the menu after execution
      });
    },
  };
}

/**
 * The exported instance of the slash menu store.
 */
export const slashMenuStore = createSlashMenuStore();
