/**
 * @file schemaService.ts
 * @service
 * @description
 * Provides sophisticated business logic for interpreting and transforming schema documents.
 * This service is responsible for converting the flat ProseMirror document structure
 * into hierarchical data structures (Tree Data) needed for UI components like the Tree View.
 * It also handles breadcrumb generation and other structural analysis tasks.
 */
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/components/visualization/StandardTree.svelte';

/**
 * Converts a ProseMirror document object into a hierarchical tree structure
 * by interpreting the semantic levels of heading nodes (h2, h3, etc.).
 *
 * This function performs a depth-first traversal of the document's block nodes
 * to reconstruct the parent-child relationships implied by heading levels.
 * It also calculates word counts for each section to provide data for visualization sizing.
 *
 * @param {ProseMirrorNode | null} doc - The ProseMirror document node to process.
 * @returns {TreeNodeData | null} A root TreeNodeData object representing the document's hierarchy, or null if the document is empty or invalid.
 */
export function documentToTreeData(
  doc: ProseMirrorNode | null
): TreeNodeData | null {
  if (!doc || doc.childCount === 0) {
    return null;
  }

  let title = 'Schema (untitled)';
  const firstNode = doc.firstChild;

  // The first node is always expected to be the H1 title.
  if (
    firstNode &&
    firstNode.type.name === 'heading' &&
    firstNode.attrs.level === 1
  ) {
    title = firstNode.textContent.trim() || title;
  }

  /**
   * Helper to count words in a string.
   * @param text The text to analyze.
   * @returns The number of words.
   */
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const root: TreeNodeData = {
    id: 'root-title',
    content: title,
    children: [],
    value: 0
  };
  
  // Use a stack to track the current nesting path based on heading levels.
  const stack: { data: TreeNodeData, level: number }[] = [{ data: root, level: 1 }];
  
  doc.descendants((node) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level;
      // H1 is the root and is already initialized in the stack.
      if (level === 1) return; 

      const nodeId = node.attrs.nodeId;

      // If a heading lacks an ID, we cannot link it reliably in the tree.
      // In the future, we might generate a temporary ID, but for now, we skip it.
      if (!nodeId) return;

      const newNode: TreeNodeData = {
        id: nodeId,
        content: node.textContent.trim() || '(Untitled)',
        children: [],
        value: countWords(node.textContent) // Start with heading's own words
      };

      // Pop the stack until we find the parent (a heading with a strictly lower level).
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.data.children?.push(newNode);
      }
      
      stack.push({ data: newNode, level });
    } else if (node.isText) {
      // Add the word count of text nodes to the section currently at the top of the stack.
      const current = stack[stack.length - 1];
      if (current && node.text) {
        current.data.value = (current.data.value || 0) + countWords(node.text);
      }
    }
  });

  return root;
}

/**
 * Generates a breadcrumb path string (e.g., "Topic > Sub-Topic") for a given position in the editor.
 * This is achieved by walking up the document tree from the given position to find all parent headings.
 *
 * @param {ProseMirrorNode} doc - The ProseMirror document node.
 * @param {number} pos - The numerical position (cursor or selection start) in the document.
 * @returns {string} A formatted breadcrumb string representing the path to the current position.
 */
export function getBreadcrumbForPosition(
  doc: ProseMirrorNode,
  pos: number
): string {
  const path: string[] = [];
  const resolvedPos = doc.resolve(pos);

  // Walk up the document tree from the current depth.
  for (let i = resolvedPos.depth; i > 0; i--) {
    const parentNode = resolvedPos.node(i);

    // If a parent is a heading (but not the main H1 title), prepend its text to our path.
    if (parentNode.type.name === 'heading' && parentNode.attrs.level > 1) {
      const text = parentNode.textContent.trim();
      if (text) {
        path.unshift(text);
      }
    }
  }

  if (path.length === 0) {
    return 'Schema Root';
  }

  return path.join(' > ');
}
