import { writable } from 'svelte/store';

// Define specific configurations for each modal type
export interface FormulaModalConfig {
  type: 'formula';
  nodePos: number;
  attrs: {
    formula: string;
  };
}

export interface MediaModalConfig {
  type: 'media';
  nodeType: 'image' | 'youtube';
  nodePos: number;
  attrs: Record<string, any>; // Allow any attributes from the node
}

// Create the discriminated union type
export type ModalConfig = FormulaModalConfig | MediaModalConfig;

interface ModalStoreState {
  isOpen: boolean;
  config: ModalConfig | null;
}

const initialState: ModalStoreState = {
  isOpen: false,
  config: null,
};

function createModalStore() {
  const { subscribe, set, update } = writable<ModalStoreState>(initialState);

  return {
    subscribe,
    open: (config: ModalConfig) => set({ isOpen: true, config }),
    close: () => set({ isOpen: false, config: null }),
  };
}

export const modalStore = createModalStore();
