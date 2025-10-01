// src/lib/stores/commandBarStore.ts
import { writable } from 'svelte/store';
import type { Command } from '$lib/types/command'; // Asegúrate de tener este tipo de Tarea 1.1

// --- 1. Definir los posibles estados y vistas ---

export type CommandBarView = 'main' | 'list-schemas' | 'ai-actions';
export type PasswordModalAction = 'export' | 'import';
export type AiHelperAction =
  | 'create-schema-from-text'
  | 'generate-flashcards'
  | 'expand-node';

// --- 2. Definir la forma completa de nuestro estado ---

export interface CommandBarState {
  isOpen: boolean;
  currentView: CommandBarView;
  isPasswordModalOpen: boolean;
  passwordModalAction: PasswordModalAction;
  isAiHelperOpen: boolean;
  aiHelperAction: AiHelperAction | null;
  isDiagnosticModalOpen: boolean; // *** 1. AÑADIR NUEVO ESTADO ***
}

// --- 3. Definir el estado inicial ---

const initialState: CommandBarState = {
  isOpen: false,
  currentView: 'main',
  isPasswordModalOpen: false,
  passwordModalAction: 'export',
  isAiHelperOpen: false,
  aiHelperAction: null,
  isDiagnosticModalOpen: false, // *** 2. INICIALIZAR EL NUEVO ESTADO ***
};

// --- 4. Crear el store con la nueva lógica ---

function createCommandBarStore() {
  const { subscribe, set, update } = writable<CommandBarState>(initialState);

  return {
    subscribe,

    // --- Acciones de Visibilidad Principal ---

    open: () => set({ ...initialState, isOpen: true }),
    close: () => set(initialState), // Resetear todo el estado al cerrar
    toggle: () =>
      update((state) => {
        // Si está cerrado, lo abrimos y reseteamos a la vista principal
        if (!state.isOpen) {
          return { ...initialState, isOpen: true };
        }
        // Si ya está abierto, lo cerramos completamente
        return initialState;
      }),

    // --- NUEVAS ACCIONES PARA GESTIONAR ESTADO INTERNO ---

    /** Cambia la lista de comandos que se muestra en el panel principal. */
    setView: (view: CommandBarView) => {
      update((state) => ({ ...state, currentView: view }));
    },

    /** Abre el modal de contraseña y cierra el panel principal de comandos. */
    openPasswordModal: (action: PasswordModalAction) => {
      update((state) => ({
        ...state,
        isOpen: false, // Ocultamos el panel principal
        isPasswordModalOpen: true,
        passwordModalAction: action,
      }));
    },

    /** Cierra el modal de contraseña. */
    closePasswordModal: () => {
      update((state) => ({ ...state, isPasswordModalOpen: false }));
    },

    /** Abre el modal de ayuda de IA y cierra el panel principal de comandos. */
    openAiHelper: (action: AiHelperAction) => {
      update((state) => ({
        ...state,
        isOpen: false, // Ocultamos el panel principal
        isAiHelperOpen: true,
        aiHelperAction: action,
      }));
    },

    /** Cierra el modal de ayuda de IA. */
    closeAiHelper: () => {
      update((state) => ({
        ...state,
        isAiHelperOpen: false,
        aiHelperAction: null,
      }));
    },
    /** Abre el modal de diagnóstico y cierra el panel principal de comandos. */
    openDiagnosticModal: () => {
      update((state) => ({
        ...state,
        isOpen: false, // Ocultamos el panel principal para no tener dos superposiciones
        isDiagnosticModalOpen: true,
      }));
    },

    /** Cierra el modal de diagnóstico. */
    closeDiagnosticModal: () => {
      update((state) => ({ ...state, isDiagnosticModalOpen: false }));
    },
  };
}

// Creamos y exportamos la instancia del store.
export const commandBarStore = createCommandBarStore();
