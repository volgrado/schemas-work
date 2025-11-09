/**
 * @file Manages the state for all modal dialogs in the application using Svelte 5 Runes.
 */

import type { Modal } from '$lib/types';

/** Defines the shape of the modal store's state. */
interface ModalState {
  isOpen: boolean;
  config: Modal.Config | null;
}

/** The initial state of the modal store. */
const initialState: ModalState = {
  isOpen: false,
  config: null,
};

// This is now VALID because the file is named .svelte.ts
export const modalState = $state<ModalState>({ ...initialState });

/**
 * Opens a modal with the specified configuration.
 * @param {Modal.Config} config - The configuration object for the modal to open.
 */
export function openModal(config: Modal.Config): void {
  modalState.isOpen = true;
  modalState.config = config;
}

/**
 * Closes the currently active modal and resets the store to its initial state.
 */
export function closeModal(): void {
  Object.assign(modalState, initialState);
}
