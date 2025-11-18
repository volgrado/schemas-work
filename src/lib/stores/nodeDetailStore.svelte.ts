/**
 * @file Manages the state for the Node Detail side panel using Svelte 5 Runes.
 * @module nodeDetailStore
 * @description This store holds the visibility, content, and active node context
 * for the global detail panel. It provides clear, atomic functions for opening
 * and closing the panel to ensure consistent state transitions.
 */

/**
 * Defines the shape of the state for the node detail panel.
 */
export interface NodeDetailState {
  /** Determines if the panel is currently visible. */
  isOpen: boolean;
  /** The title displayed in the panel's header, usually the node's content. */
  title: string;
  /** The main body content to display in the panel. */
  content: string;
  /** The unique identifier of the node currently displayed in the panel. */
  activeNodeId: string | null;
}

/**
 * The initial, default state for the panel when the application loads or when the panel is closed.
 * @private
 */
const initialState: NodeDetailState = {
  isOpen: false,
  title: '',
  content: '',
  activeNodeId: null,
};

/**
 * The reactive Svelte 5 store for the node detail panel.
 * Components can subscribe to this state to react to changes.
 *
 * @example
 * import { nodeDetailState } from '$lib/stores/nodeDetailStore.svelte';
 *
 * // In a component:
 * $: isOpen = nodeDetailState.isOpen;
 */
export const nodeDetailState = $state<NodeDetailState>({ ...initialState });

/**
 * Opens the side panel and populates it with content.
 * This is the designated function for triggering the panel's appearance.
 *
 * @param {string} nodeId - The unique ID of the node being displayed.
 * @param {string} title - The title to show in the panel's header.
 * @param {string} content - The descriptive content to show in the panel's body.
 */
export function openPanel(
  nodeId: string,
  title: string,
  content: string
): void {
  nodeDetailState.isOpen = true;
  nodeDetailState.title = title;
  nodeDetailState.content = content;
  nodeDetailState.activeNodeId = nodeId;
}

/**
 * Closes the side panel and resets its state to default values.
 */
export function closePanel(): void {
  nodeDetailState.isOpen = false;

  // After a delay to allow for CSS exit animations to complete,
  // reset the content to prevent a "flash" of old content on the next open.
  setTimeout(() => {
    // Check if the panel was opened again before the timeout finished.
    if (!nodeDetailState.isOpen) {
      nodeDetailState.title = initialState.title;
      nodeDetailState.content = initialState.content;
      nodeDetailState.activeNodeId = initialState.activeNodeId;
    }
  }, 300); // This duration should match the transition duration in your CSS.
}
