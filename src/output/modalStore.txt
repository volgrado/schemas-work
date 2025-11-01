/**
 * @file modalStore.ts
 * @description Manages the state for all modal dialogs in the application.
 *
 * This store provides a centralized system for opening and closing modals, ensuring that
 * only one modal can be active at a time. It uses a discriminated union (`ModalConfig`)
 * to handle different types of modals with varying data requirements in a type-safe manner.
 */

import { writable } from 'svelte/store';

/**
 * Configuration for the formula editing modal.
 * @interface FormulaModalConfig
 */
export interface FormulaModalConfig {
  /** The type of the modal, used as the discriminator. */
  type: 'formula';
  /** The ProseMirror position of the node being edited. */
  nodePos: number;
  /** The attributes of the formula node. */
  attrs: {
    formula: string;
  };
}

/**
 * Configuration for the media (image or YouTube) editing modal.
 * @interface MediaModalConfig
 */
export interface MediaModalConfig {
  /** The type of the modal, used as the discriminator. */
  type: 'media';
  /** The specific type of the media node. */
  nodeType: 'image' | 'youtube';
  /** The ProseMirror position of the node being edited. */
  nodePos: number;
  /** The full attribute set from the media node being edited. */
  attrs: Record<string, any>;
}

/**
 * A discriminated union of all possible modal configurations.
 * The `type` property is used to determine which modal to display.
 */
export type ModalConfig = FormulaModalConfig | MediaModalConfig;

/**
 * Defines the shape of the modal store's state.
 * @interface ModalStoreState
 */
interface ModalStoreState {
  /** Whether a modal is currently open. */
  isOpen: boolean;
  /** The configuration object for the currently open modal. `null` if no modal is open. */
  config: ModalConfig | null;
}

/**
 * The initial state of the modal store.
 * @internal
 */
const initialState: ModalStoreState = {
  isOpen: false,
  config: null,
};

/**
 * Creates a custom Svelte store for managing modals.
 * @returns {object} The modal store with `subscribe`, `open`, and `close` methods.
 */
function createModalStore() {
  const { subscribe, set } = writable<ModalStoreState>(initialState);

  return {
    subscribe,
    /**
     * Opens a modal with the specified configuration.
     * @param {ModalConfig} config - The configuration object for the modal to open.
     */
    open: (config: ModalConfig) => set({ isOpen: true, config }),
    /**
     * Closes the currently active modal and resets the store to its initial state.
     */
    close: () => set({ isOpen: false, config: null }),
  };
}

/**
 * The singleton instance of the modal store.
 * To use it, import `modalStore` and call its methods.
 *
 * @example
 * import { modalStore } from './modalStore';
 *
 * function openFormulaEditor() {
 *   modalStore.open({ type: 'formula', nodePos: 10, attrs: { formula: 'x^2' } });
 * }
 *
 * function onSave() {
 *   // ... save logic ...
 *   modalStore.close();
 * }
 */
export const modalStore = createModalStore();
