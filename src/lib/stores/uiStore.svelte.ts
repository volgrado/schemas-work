/**
 * @file Centralized UI state management for the application.
 * @module uiStore
 * @description Unifies the state of various UI components (Modals, CommandBar, SidePanel)
 * into a single source of truth by composing existing stores.
 */

import type { Modal } from '$lib/types';
import { modalState, openModal as _openModal, closeModal as _closeModal } from './modalStore.svelte';
import { commandBarState, open as _openCommandBar, close as _closeCommandBar, toggle as _toggleCommandBar } from './commandBarStore.svelte';
import { nodeDetailState, openPanel as _openPanel, closePanel as _closePanel } from './nodeDetailStore.svelte';

// Re-export types
export type { CommandBarState } from './commandBarStore.svelte';
export type { NodeDetailState } from './nodeDetailStore.svelte';

// --- Local State ---
let activeView = $state<'editor' | 'tree'>('editor');

// --- Unified State Object ---
// We use getters to expose the reactive state objects from the other stores.
export const uiState = {
  get activeView() { return activeView; },
  set activeView(v) { activeView = v; },
  
  get modal() { return modalState; },
  get commandBar() { return commandBarState; },
  get nodeDetail() { return nodeDetailState; }
};

// --- Actions ---

export function setActiveView(view: 'editor' | 'tree') {
  activeView = view;
}

export function toggleActiveView() {
  activeView = activeView === 'editor' ? 'tree' : 'editor';
}

// --- Modal Actions (Proxy) ---

export function openModal(config: Modal.Config) {
  _openModal(config);
}

export function closeModal() {
  _closeModal();
}

// --- Command Bar Actions (Proxy) ---

export function openCommandBar() {
  _openCommandBar();
}

export function closeCommandBar() {
  _closeCommandBar();
}

export function toggleCommandBar() {
  _toggleCommandBar();
}

// --- Node Detail Actions (Proxy) ---

export function openNodeDetail(nodeId: string, title: string, content: string) {
  _openPanel(nodeId, title, content);
}

export function closeNodeDetail() {
  _closePanel();
}
