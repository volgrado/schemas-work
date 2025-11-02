/**
 * @file modalStore.ts
 * @description Manages the state for all modal dialogs in the application.
 *
 * This store provides a centralized system for opening and closing modals, ensuring that
 * only one modal can be active at a time. It uses a discriminated union (`ModalConfig`)
 * to handle different types of modals with varying data requirements in a type-safe manner.
 */

import { writable } from 'svelte/store';

// =================================================================
// --- TYPE DEFINITIONS for Modal Configurations ---
// =================================================================

/**
 * Configuration for the formula editing modal.
 * This is used to pass the necessary data to the `FormulaEditorModal` component.
 * @interface FormulaModalConfig
 */
export interface FormulaModalConfig {
  /** The type of the modal, used as the discriminator. */
  type: 'formula';
  /** The ProseMirror position of the math node being edited. */
  nodePos: number;
  /** The type of math node, to determine KaTeX's display mode. */
  nodeType: 'math_block' | 'math_inline';
  /** The starting LaTeX formula to populate the editor with. */
  initialFormula: string;
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
 * The `type` property is essential for TypeScript to correctly infer the
 * shape of the config object in Svelte components.
 */
export type ModalConfig = FormulaModalConfig | MediaModalConfig;

// =================================================================
// --- STORE DEFINITION ---
// =================================================================

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
 * This factory function encapsulates the store's logic, providing a clean API.
 * @returns {object} The modal store with `subscribe`, `open`, and `close` methods.
 */
function createModalStore() {
  const { subscribe, set } = writable<ModalStoreState>(initialState);

  return {
    subscribe,

    /**
     * Opens a modal with the specified configuration.
     * Any currently open modal will be replaced.
     * @param {ModalConfig} config - The configuration object for the modal to open.
     */
    open: (config: ModalConfig) => set({ isOpen: true, config }),

    /**
     * Closes the currently active modal and resets the store to its initial state.
     */
    close: () => set(initialState),
  };
}

/**
 * The singleton instance of the modal store.
 * Import this instance into any component or service that needs to interact with modals.
 *
 * @example
 * // In a Svelte component to open a modal
 * import { modalStore } from './modalStore';
 *
 * function editFormula() {
 *   modalStore.open({
 *     type: 'formula',
 *     nodePos: 15,
 *     nodeType: 'math_block',
 *     initialFormula: 'E = mc^2'
 *   });
 * }
 *
 * @example
 * <!-- In a Svelte component to conditionally render a modal -->
 * {#if $modalStore.config?.type === 'formula'}
 *   <Modal title="Edit Formula" onClose={modalStore.close}>
 *     <FormulaEditorModal {...$modalStore.config} onClose={modalStore.close} />
 *   </Modal>
 * {/if}
 */
export const modalStore = createModalStore();
