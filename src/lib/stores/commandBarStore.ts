import { writable, get } from 'svelte/store';

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
  isDiagnosticModalOpen: boolean;

  // ✅ NUEVA PROPIEDAD: Guarda el ID de la carpeta que se está viendo en el explorador.
  currentParentId: string | null;
}

// --- 3. Definir el estado inicial ---
const initialState: CommandBarState = {
  isOpen: false,
  currentView: 'main',
  isPasswordModalOpen: false,
  passwordModalAction: 'export',
  isAiHelperOpen: false,
  aiHelperAction: null,
  isDiagnosticModalOpen: false,

  // ✅ NUEVA PROPIEDAD: Inicializamos el contexto de la carpeta.
  currentParentId: null,
};

// --- 4. Crear el store con la nueva lógica ---
function createCommandBarStore() {
  const { subscribe, set, update } = writable<CommandBarState>(initialState);

  return {
    subscribe,

    // --- Acciones de Visibilidad Principal ---
    open: () => set({ ...initialState, isOpen: true }),
    close: () => set(initialState),
    toggle: () =>
      update((state) => {
        if (!state.isOpen) {
          return { ...initialState, isOpen: true };
        }
        return initialState;
      }),

    // --- Acciones para Gestionar Estado Interno ---
    setView: (view: CommandBarView) => {
      update((state) => ({ ...state, currentView: view }));
    },

    // ✅ NUEVA ACCIÓN: Permite que FileExplorerView actualice el contexto global.
    setCurrentParentId: (id: string | null) => {
      update((state) => ({ ...state, currentParentId: id }));
    },

    openPasswordModal: (action: PasswordModalAction) => {
      update((state) => ({
        ...state,
        isOpen: false,
        isPasswordModalOpen: true,
        passwordModalAction: action,
      }));
    },
    closePasswordModal: () => {
      update((state) => ({ ...state, isPasswordModalOpen: false }));
    },
    openAiHelper: (action: AiHelperAction) => {
      update((state) => ({
        ...state,
        isOpen: false,
        isAiHelperOpen: true,
        aiHelperAction: action,
      }));
    },
    closeAiHelper: () => {
      update((state) => ({
        ...state,
        isAiHelperOpen: false,
        aiHelperAction: null,
      }));
    },
    openDiagnosticModal: () => {
      update((state) => ({
        ...state,
        isOpen: false,
        isDiagnosticModalOpen: true,
      }));
    },
    closeDiagnosticModal: () => {
      update((state) => ({ ...state, isDiagnosticModalOpen: false }));
    },
  };
}

// Creamos y exportamos la instancia del store.
export const commandBarStore = createCommandBarStore();
