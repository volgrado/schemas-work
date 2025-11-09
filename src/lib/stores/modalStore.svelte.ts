/**
 * @file Manages the state for all modal dialogs in the application using Svelte 5 Runes.
 */

import type { Modal } from '$lib/types';

interface ModalState {
  show: boolean; // Renamed from isOpen for consistency
  config: Modal.Config | null;
}

const initialState: ModalState = {
  show: false,
  config: null,
};

export const modalState = $state<ModalState>({ ...initialState });

/**
 * Opens a modal with the specified configuration.
 * @param {Modal.Config} config - The configuration object for the modal to open.
 */
export function openModal(config: Modal.Config): void {
  modalState.config = config;
  modalState.show = true;
}

/**
 * Closes the currently active modal.
 */
export function closeModal(): void {
  modalState.show = false;
  // We don't nullify the config immediately to allow for closing animations.
  // It will be replaced the next time openModal is called.
}
