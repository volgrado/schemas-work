// src/lib/stores/commandBarStore.ts
import { writable } from 'svelte/store';

// La función 'createStore' encapsula la lógica.
function createCommandBarStore() {
  // Creamos un store 'writable' interno, que empieza en 'false' (cerrado).
  const { subscribe, set, update } = writable(false);

  return {
    subscribe, // Exponemos 'subscribe' para poder usar '$commandBarStore' en los componentes.
    open: () => set(true), // Acción para abrir el panel.
    close: () => set(false), // Acción para cerrar el panel.
    toggle: () => update((isOpen) => !isOpen), // Acción para alternar el estado (muy útil para Ctrl+K).
  };
}

// Creamos y exportamos la instancia del store.
export const commandBarStore = createCommandBarStore();
