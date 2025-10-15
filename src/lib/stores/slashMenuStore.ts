// src/lib/stores/slashMenuStore.ts
import { writable } from 'svelte/store';
import type { CommandItem } from '$lib/editor/slashCommands';

/**
 * Defines the shape of the state for the slash command menu.
 */
interface SlashMenuState {
  isOpen: boolean;
  allItems: CommandItem[];
  filteredItems: CommandItem[];
  groups: string[];
  activeGroupIndex: number;
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
  commandToExecute: ((item: CommandItem) => void) | null;
  query: string;
}

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
 * Creates a custom store for managing the state of the slash command menu.
 * @returns A store object with methods to manage the slash menu.
 */
function createSlashMenuStore() {
  const { subscribe, update, set } = writable<SlashMenuState>(initialState);

  const filterAndSetItems = (state: SlashMenuState): SlashMenuState => {
    const activeGroup = state.groups[state.activeGroupIndex];
    const filteredItems = state.allItems.filter(
      (item) => item.group === activeGroup
    );
    return { ...state, filteredItems, selectedIndex: 0 };
  };

  return {
    subscribe,

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
        activeGroupIndex: 0,
        clientRect,
        commandToExecute: command,
        query,
      });
      set(newState);
    },

    close: () => set(initialState),

    updateItems: (newItems: CommandItem[], query: string) => {
      update((state) => {
        const groups = [...new Set(newItems.map((item) => item.group))];
        const activeGroupIndex =
          state.activeGroupIndex >= groups.length ? 0 : state.activeGroupIndex;
        const newState = filterAndSetItems({
          ...state,
          allItems: newItems,
          groups,
          activeGroupIndex,
          query,
        });
        return newState;
      });
    },

    moveSelection: (direction: 1 | -1) => {
      update((state) => {
        if (state.filteredItems.length === 0) return state;
        const newIndex =
          (state.selectedIndex + state.filteredItems.length + direction) %
          state.filteredItems.length;
        return { ...state, selectedIndex: newIndex };
      });
    },

    moveGroup: (direction: 1 | -1) => {
      update((state) => {
        if (state.groups.length <= 1) return state;
        const newIndex =
          (state.activeGroupIndex + state.groups.length + direction) %
          state.groups.length;
        return filterAndSetItems({ ...state, activeGroupIndex: newIndex });
      });
    },

    setActiveGroup: (index: number) => {
      update((state) => {
        if (index === state.activeGroupIndex) return state;
        return filterAndSetItems({ ...state, activeGroupIndex: index });
      });
    },

    triggerCommand: () => {
      update((state) => {
        const item = state.filteredItems[state.selectedIndex];
        if (item && state.commandToExecute) {
          state.commandToExecute(item);
        }
        return initialState;
      });
    },

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

export const slashMenuStore = createSlashMenuStore();
