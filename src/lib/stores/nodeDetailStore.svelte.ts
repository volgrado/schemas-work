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
  requestedFocusId: null,
  width: 480,
  isResizing: false,
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
  
  // Automatically align the reader with the selected node
  alignEditorWithNode();
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

/**
 * Requests the tree to focus (pan/zoom) on the currently active node.
 */
export function requestFocus(): void {
  if (nodeDetailState.activeNodeId) {
    nodeDetailState.requestedFocusId = nodeDetailState.activeNodeId;
    // Reset immediately after setting to allow re-triggering if needed,
    // but usually the consumer clears it or just reacts to the change.
    // Better pattern: let the consumer reset it or just use a timestamp/counter if needed.
    // For now, simple string change is enough if we toggle it.
    // Actually, to ensure it triggers even if same ID, we might need a "trigger" counter.
    // But since we only focus the *current* node, setting it to the ID is fine.
    // The consumer should set it back to null after handling.
  }
}

export function clearFocusRequest(): void {
  nodeDetailState.requestedFocusId = null;
}

/**
 * Sets the width of the side panel.
 * @param width Width in pixels
 */
export function setPanelWidth(width: number): void {
  // Enforce min/max constraints
  const minWidth = 320;
  const maxWidth = 800;
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

  import('$lib/stores/editorStore.svelte').then(({ editorState }) => {
    const editor = editorState.instance;
    if (!editor) return;

    // Find the heading node by nodeId
    let targetPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs.nodeId === nodeDetailState.activeNodeId) {
        targetPos = pos;
        return false; // Stop iteration
      }
    });

    if (targetPos !== -1) {
      // Scroll into view with offset for header
      const coords = editor.view.coordsAtPos(targetPos);
      const absoluteTop = window.scrollY + coords.top;
      
      window.scrollTo({
        top: absoluteTop - 100, // Offset for app header
        behavior: 'smooth'
      });
      
      // Add temporary highlight effect
      setTimeout(() => {
        const domNode = editor.view.nodeDOM(targetPos);
        if (domNode && domNode instanceof HTMLElement) {
          domNode.classList.add('focus-highlight');
          setTimeout(() => {
            domNode.classList.remove('focus-highlight');
          }, 2000);
        }
      }, 100);
    }
  });
}

/**
 * Scrolls the editor to the node and highlights it.
 * This allows users to jump from the tree/panel directly to the document.
 * Also temporarily highlights the heading for visual focus.
 */
export function scrollToNodeInEditor(): void {
  if (!nodeDetailState.activeNodeId) return;
  
  // Close the panel when focusing in document
  closePanel();
  
  // Dynamic import to avoid circular dependency
  import('$lib/stores/editorStore.svelte').then(({ editorState }) => {
    const editor = editorState.instance;
    if (!editor) return;
    
    // Find the heading node by nodeId
    let targetPos = -1;
    let targetNode: any = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.attrs.nodeId === nodeDetailState.activeNodeId) {
        targetPos = pos;
        targetNode = node;
        return false; // Stop iteration
      }
    });
    
    if (targetPos !== -1 && targetNode) {
      // Focus the editor and set selection to include the entire heading
      editor.commands.focus();
      const headingEnd = targetPos + targetNode.nodeSize;
      editor.commands.setTextSelection({ from: targetPos, to: headingEnd });
      
      // Scroll into view with offset for header
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      
      // Use smooth scroll
      window.scrollTo({
        top: coords.top - 100, // Offset for app header
        behavior: 'smooth'
      });
      
      // Add temporary highlight effect (like TTS)
      // We'll use a CSS class that auto-removes after animation
      setTimeout(() => {
        const domNode = editor.view.nodeDOM(targetPos);
        if (domNode && domNode instanceof HTMLElement) {
          domNode.classList.add('focus-highlight');
          
          // Remove after animation completes
          setTimeout(() => {
            domNode.classList.remove('focus-highlight');
          }, 2000); // 2 second highlight
        }
      }, 100); // Small delay for scroll to start
    }
  });
}

/**
 * Navigate to the next or previous node in the flattened tree.
 * @param direction 'next' or 'prev'
 */
export function navigateToSibling(direction: 'next' | 'prev'): void {
  if (!nodeDetailState.activeNodeId || flattenedNodes.length === 0) return;
  
  const currentIndex = flattenedNodes.findIndex(n => n.id === nodeDetailState.activeNodeId);
  if (currentIndex === -1) return;
  
  let targetIndex: number;
  if (direction === 'next') {
    targetIndex = currentIndex + 1;
    if (targetIndex >= flattenedNodes.length) {
      // Already at last node, wrap around to first
      targetIndex = 0;
    }
  } else {
    targetIndex = currentIndex - 1;
    if (targetIndex < 0) {
      // Already at first node, wrap around to last
      targetIndex = flattenedNodes.length - 1;
    }
  }
  
  const targetNode = flattenedNodes[targetIndex];
  if (targetNode) {
    // Open the panel with the new node's data
    openPanel(targetNode.id, targetNode.title, targetNode.content);
    
    // Request focus in tree to keep the tree view synced
    requestFocus();
  }
}
