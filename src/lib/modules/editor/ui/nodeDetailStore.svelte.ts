/**
 * @file Manages the state for the Node Detail side panel using Svelte 5 Runes.
 * @module nodeDetailStore
 * @description This store holds the visibility, content, and active node context
 * for the global detail panel. It delegates complex editor interactions to NodeDetailService.
 */

import { NodeDetailService } from '$lib/modules/editor/domain/nodeDetailService';

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
  /** The starting position of the content in the main document. */
  contentStartPos: number | null;
  /** The ending position of the content in the main document. */
  contentEndPos: number | null;
  /** Signal to request focus on a specific node (consumed by SchemaTree). */
  requestedFocusId: string | null;
  /** The current width of the panel in pixels. */
  width: number;
  /** Whether the panel is currently being resized. */
  isResizing: boolean;
}

/**
 * Store the flattened tree data for navigation.
 * This is populated by SchemaTree when the tree is rendered.
 */
let flattenedNodes: Array<{ id: string; title: string; content: string }> = [];

/**
 * Set the flattened tree data for navigation.
 */
export function setFlattenedTree(nodes: Array<{ id: string; title: string; content: string }>) {
  flattenedNodes = nodes;
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
  contentStartPos: null,
  contentEndPos: null,
  requestedFocusId: null,
  width: 480,
  isResizing: false,
};

/**
 * The reactive Svelte 5 store for the node detail panel.
 */
export const nodeDetailState = $state<NodeDetailState>({ ...initialState });

/**
 * Opens the side panel and populates it with content.
 */
export function openPanel(
  nodeId: string,
  title: string,
  content: string,
  startPos?: number,
  endPos?: number
): void {
  nodeDetailState.isOpen = true;
  nodeDetailState.title = title;
  nodeDetailState.content = content;
  nodeDetailState.activeNodeId = nodeId;
  nodeDetailState.contentStartPos = startPos ?? null;
  nodeDetailState.contentEndPos = endPos ?? null;
  
  // Automatically align the reader with the selected node
  alignEditorWithNode();
}

/**
 * Closes the side panel and resets its state to default values.
 */
export function closePanel(): void {
  nodeDetailState.isOpen = false;

  setTimeout(() => {
    if (!nodeDetailState.isOpen) {
      nodeDetailState.title = initialState.title;
      nodeDetailState.content = initialState.content;
      nodeDetailState.activeNodeId = initialState.activeNodeId;
    }
  }, 300);
}

/**
 * Requests the tree to focus (pan/zoom) on the currently active node.
 */
export function requestFocus(): void {
  if (nodeDetailState.activeNodeId) {
    nodeDetailState.requestedFocusId = nodeDetailState.activeNodeId;
  }
}

export function clearFocusRequest(): void {
  nodeDetailState.requestedFocusId = null;
}

/**
 * Sets the width of the side panel.
 */
export function setPanelWidth(width: number): void {
  const minWidth = 320;
  const maxWidth = 2400;
  nodeDetailState.width = Math.max(minWidth, Math.min(width, maxWidth));
}

export function setIsResizing(isResizing: boolean): void {
  nodeDetailState.isResizing = isResizing;
}

/**
 * Aligns the editor view with the currently active node without changing focus or closing the panel.
 */
export function alignEditorWithNode(): void {
  if (!nodeDetailState.activeNodeId) return;
  NodeDetailService.alignEditorWithNode(nodeDetailState.activeNodeId);
}

/**
 * Scrolls the editor to the node and highlights it.
 */
export function scrollToNodeInEditor(): void {
  if (!nodeDetailState.activeNodeId) return;
  
  closePanel();
  NodeDetailService.scrollToNodeInEditor(nodeDetailState.activeNodeId);
}

/**
 * Navigate to the next or previous node in the flattened tree.
 */
export function navigateToSibling(direction: 'next' | 'prev'): void {
  if (!nodeDetailState.activeNodeId || flattenedNodes.length === 0) return;
  
  const currentIndex = flattenedNodes.findIndex(n => n.id === nodeDetailState.activeNodeId);
  if (currentIndex === -1) return;
  
  let targetIndex: number;
  if (direction === 'next') {
    targetIndex = currentIndex + 1;
    if (targetIndex >= flattenedNodes.length) {
      targetIndex = 0;
    }
  } else {
    targetIndex = currentIndex - 1;
    if (targetIndex < 0) {
      targetIndex = flattenedNodes.length - 1;
    }
  }
  
  const targetNode = flattenedNodes[targetIndex];
  if (targetNode) {
    openPanel(targetNode.id, targetNode.title, targetNode.content);
    requestFocus();
  }
}

/**
 * Updates the content of a specific node in the editor.
 */
export function updateNodeAtPos(pos: number, domElement: HTMLElement): void {
  NodeDetailService.updateNodeAtPos(pos, domElement);
}
