import { DOMParser } from 'prosemirror-model';

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
 * Components can subscribe to this state to react to changes.
 *
 * @example
 * import { nodeDetailState } from '$lib/stores/nodeDetailStore.svelte';
 *
 * // In a component:
 * let isOpen = $derived(nodeDetailState.isOpen);
 */
export const nodeDetailState = $state<NodeDetailState>({ ...initialState });

/**
 * Opens the side panel and populates it with content.
 * This is the designated function for triggering the panel's appearance.
 *
 * @param {string} nodeId - The unique ID of the node being displayed.
 * @param {string} title - The title to show in the panel's header.
 * @param {string} content - The descriptive content to show in the panel's body.
 * @param {number} [startPos] - The starting position of the content in the main doc.
 * @param {number} [endPos] - The ending position of the content in the main doc.
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

  import('$lib/modules/editor/ui/editorStore.svelte').then(({ editorState }) => {
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
      const domNode = editor.view.nodeDOM(targetPos);
      if (domNode && domNode instanceof HTMLElement) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
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
  import('$lib/modules/editor/ui/editorStore.svelte').then(({ editorState }) => {
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
      
      // Scroll into view
      const domNode = editor.view.nodeDOM(targetPos);
      if (domNode && domNode instanceof HTMLElement) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
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

/**
 * Updates the content of a specific node in the editor.
 * Used for syncing edits from the detail panel back to the document.
 * 
 * @param pos The position of the node in the document
 * @param domElement The DOM element containing the new content
 */
export function updateNodeAtPos(pos: number, domElement: HTMLElement): void {
  import('$lib/modules/editor/ui/editorStore.svelte').then(({ editorState }) => {
    const editor = editorState.instance;
    if (!editor) return;

    const { state, view } = editor;
    const tr = state.tr;
    const node = state.doc.nodeAt(pos);
    
    if (!node) {
      console.warn(`[NodeDetail] No node found at pos ${pos}`);
      return;
    }

    try {
      // Parse the content from the DOM element using the schema
      // We use DOMParser to convert the HTML back to a Slice
      const parser = DOMParser.fromSchema(state.schema);
      
      // We need to be careful: domElement might be a wrapper div.
      // If the node is a block (e.g. paragraph), we want the content inside.
      // parser.parseSlice will parse the innerHTML of the element if we pass the element.
      // But wait, parseSlice takes a DOM node.
      
      // If we are updating a Paragraph, we want the content of the paragraph.
      // If we pass the paragraph element itself, it might try to parse it as a paragraph inside a paragraph?
      // No, DOMParser rules define how to match.
      
      // Let's assume domElement is the <div> or <p> that corresponds to the node.
      // We want to replace the node's content or the node itself.
      // If we replace the node itself, we need to ensure the type matches.
      
      // Strategy: Parse the element into a Slice.
      // If the slice contains a single node of the same type, replace the node.
      // If it contains inline content and the target is a textblock, replace content.
      
      const slice = parser.parseSlice(domElement, { preserveWhitespace: true });
      
      // If the node is a textblock (like paragraph, heading), we usually just want to update its content.
      if (node.isTextblock) {
        // Replace the content of the node
        // The range is [pos + 1, pos + node.nodeSize - 1]? No.
        // pos is the start of the node.
        // Content starts at pos + 1.
        // Content ends at pos + node.nodeSize - 1.
        
        const start = pos + 1;
        const end = pos + node.nodeSize - 1;
        
        // We need to check if the slice content is compatible.
        // slice.content is a Fragment.
        
        tr.replace(start, end, slice);
      } else {
        // For non-textblocks (e.g. images, or containers), it's more complex.
        // We'll try to replace the whole node if possible.
        tr.replaceWith(pos, pos + node.nodeSize, slice.content);
      }

      if (tr.docChanged) {
        view.dispatch(tr);
      }
    } catch (e) {
      console.error('[NodeDetail] Failed to update node content:', e);
    }
  });
}
