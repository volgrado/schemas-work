/**
 * @file Provides business logic for interpreting and transforming schema documents.
 * This service is responsible for converting the flat ProseMirror document structure
 * into hierarchical data structures needed for UI components like the Tree View.
 */
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/components/tree/SchemaTree.svelte';

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

  const root: TreeNodeData = {
    id: 'root-title',
    content: title,
    children: [],
  };

  // A stack to keep track of the current parent for different heading levels.
  // stack[0] is the root, stack[1] is the last H2, stack[2] is the last H3.
  const parentStack: TreeNodeData[] = [root];

  doc.content.forEach((node) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level;
      // We only build the tree from H2 and deeper. H1 is the root.
      if (level <= 1) return;

      // The nodeId is critical for linking tree nodes back to the editor.
      const nodeId = node.attrs.nodeId;
      if (!nodeId) {
        console.warn(
          'SKIPPING: Heading node is missing nodeId attribute.',
          node.toJSON()
        );
        return;
      }

      const newNode: TreeNodeData = {
        id: nodeId,
        content: node.textContent.trim() || '(Untitled Node)',
        children: [],
      };

      // Adjust the stack to find the correct parent.
      // e.g., If we see an H3 (level 3), we want the stack to have the root and the last H2.
      // The desired stack length is `level - 1`.
      while (parentStack.length > level - 1) {
        parentStack.pop();
      }

      // The parent is now at the top of the stack.
      const parent = parentStack[parentStack.length - 1];
      if (parent && parent.children) {
        parent.children.push(newNode);
      }

      // Push the new node onto the stack, making it the parent for subsequent, deeper headings.
      parentStack.push(newNode);
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
