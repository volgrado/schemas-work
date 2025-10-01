// src/lib/stores/slashMenuStore.ts
import { writable } from 'svelte/store';
import type { CommandItem } from '$lib/editor/slashCommands';

// 1. Definimos la "forma" de nuestro estado
interface SlashMenuState {
  isOpen: boolean;
  items: CommandItem[];
  selectedIndex: number;
  clientRect: (() => DOMRect | null) | null;
  commandToExecute: ((item: CommandItem) => void) | null;
}

// 2. Definimos el estado inicial
const initialState: SlashMenuState = {
  isOpen: false,
  items: [],
  selectedIndex: 0,
  clientRect: null,
  commandToExecute: null,
};

// 3. Creamos la función que devuelve nuestro custom store
function createSlashMenuStore() {
  const { subscribe, update, set } = writable<SlashMenuState>(initialState);

  return {
    subscribe, // Exponemos 'subscribe' para que se pueda usar el prefijo '$' en componentes

    // Acciones para modificar el estado
    open: (
      items: CommandItem[],
      clientRect: (() => DOMRect | null) | null,
      command: (item: CommandItem) => void
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

    close: () => {
      set(initialState); // set() es más simple para un reseteo completo
    },

    updateItems: (newItems: CommandItem[]) => {
      update((state) => ({
        ...state,
        items: newItems,
        // Reseteamos el índice si la lista cambia y el índice actual queda fuera de rango
        selectedIndex:
          state.selectedIndex >= newItems.length ? 0 : state.selectedIndex,
      }));
    },

    moveSelection: (direction: 1 | -1) => {
      update((state) => {
        if (state.items.length === 0) return state;
        const newIndex =
          (state.selectedIndex + state.items.length + direction) %
          state.items.length;
        return { ...state, selectedIndex: newIndex };
      });
    },

    // El comando se ejecuta y luego se cierra el menú
    triggerCommand: () => {
      update((state) => {
        const item = state.items[state.selectedIndex];
        if (item && state.commandToExecute) {
          state.commandToExecute(item);
        }
        return initialState; // Cerramos el menú después de ejecutar
      });
    },

    triggerCommandByIndex: (index: number) => {
      update((state) => {
        const item = state.items[index];
        if (item && state.commandToExecute) {
          state.commandToExecute(item);
        }
        return initialState; // Cerramos el menú después de ejecutar
      });
    },
  };
}

// 4. Exportamos la instancia del store
export const slashMenuStore = createSlashMenuStore();
