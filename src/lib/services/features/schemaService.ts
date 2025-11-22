/**
 * @file Provides business logic for interpreting and transforming schema documents.
 * This service is responsible for converting the flat ProseMirror document structure
 * into hierarchical data structures needed for UI components like the Tree View.
 */
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/components/visualization/StandardTree.svelte';

/**
 * Converts a ProseMirror document object into a hierarchical tree structure
 * by interpreting the semantic levels of heading nodes (h2, h3, etc.).
 *
 * @param doc The ProseMirror document node.
 * @returns A root TreeNodeData object representing the document's hierarchy, or null if the document is empty.
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

  // Helper to count words in a string
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const root: TreeNodeData = {
    id: 'root-title',
    content: title,
    children: [],
    value: 0
  };
  
  const stack: { data: TreeNodeData, level: number }[] = [{ data: root, level: 1 }];
  
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level;
      // H1 is root, already in stack.
      if (level === 1) return; 

      const nodeId = node.attrs.nodeId;
      // If no ID, treat as content of current parent? Or skip? Let's skip for tree structure but count words?
      // For now, strictly follow tree structure.
      if (!nodeId) return;

      const newNode: TreeNodeData = {
        id: nodeId,
        content: node.textContent.trim() || '(Untitled)',
        children: [],
        value: countWords(node.textContent) // Start with heading's own words
      };

      // Pop stack until we find the parent (level < current level)
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.data.children?.push(newNode);
      }
      
      stack.push({ data: newNode, level });
    } else if (node.isText) {
      // Add word count to the current node at the top of the stack
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
 * This is achieved by walking up the document tree from the given position.
 *
 * @param doc The ProseMirror document node.
 * @param pos The numerical position in the document.
 * @returns A formatted breadcrumb string.
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
