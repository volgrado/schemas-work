/**
 * @file Provides business logic for interpreting and transforming schema documents.
 *
 * @remarks
 * This service is the core analytical engine for understanding the structure of a
 * ProseMirror/Tiptap document, which is the underlying representation of a schema. It is
 * responsible for converting the flat, node-based structure of the document into a
 * hierarchical tree format. This tree is suitable for consumption by UI components,
 * such as a side navigation tree. Additionally, it provides functionality for generating
 * contextual information, such as breadcrumbs, which are vital for features like
 * AI-driven node expansion and content generation.
 */

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/types/tree';

/**
 * Converts a ProseMirror document object into a hierarchical tree structure.
 *
 * @remarks
 * This function traverses a given ProseMirror document to build a `TreeNodeData` object.
 * It first attempts to identify the schema's title by searching for an H1 or H2 tag.
 * It then processes the main bullet list within the document to create a nested hierarchy.
 * Each list item (`<li>`) in the document is transformed into a node in the tree, and any
 * nested lists (`<ul>` or `<ol>`) within that item become its children. This function is
 * essential for rendering the schema's structure in a tree-view component.
 *
 * @param doc The root node of the ProseMirror document, typically retrieved from `editor.state.doc`.
 * @returns A `TreeNodeData` object representing the full schema hierarchy, or `null` if the
 *          document is empty or a valid list structure cannot be found.
 */
export function documentToTreeData(
  doc: ProseMirrorNode | null,
): TreeNodeData | null {
  if (!doc || doc.childCount === 0) {
    return null;
  }

  let title = 'Schema (untitled)';
  let titleFound = false;

  // First pass: Attempt to find the main title from the first H1 tag.
  doc.descendants((node) => {
    if (node.type.name === 'heading' && node.attrs.level === 1) {
      if (node.textContent.trim()) {
        title = node.textContent.trim();
        titleFound = true;
      }
      return false; // Stop searching once the first H1 is found and processed.
    }
    return true;
  });

  // Fallback: If no H1 is found, use the first H2 tag as the title.
  if (!titleFound) {
    doc.descendants((node) => {
      if (node.type.name === 'heading' && node.attrs.level === 2) {
        if (node.textContent.trim()) {
          title = node.textContent.trim();
          titleFound = true;
        }
        return false; // Stop searching.
      }
      return true;
    });
  }

  // Identify the primary bullet list that will serve as the foundation of the tree.
  let mainList: ProseMirrorNode | undefined;
  const topLevelLists: ProseMirrorNode[] = [];
  doc.forEach((node) => {
    if (node.type.name === 'bulletList') {
      topLevelLists.push(node);
    }
  });

  // Heuristic: The "main" list is assumed to be the one with the largest node size (most content).
  if (topLevelLists.length > 0) {
    mainList = topLevelLists.reduce((prev, current) =>
      prev.nodeSize > current.nodeSize ? prev : current,
    );
  } else {
    // Fallback if no top-level lists exist: find the very first list anywhere in the document.
    doc.descendants((node) => {
      if (mainList) return false; // Stop once found.
      if (node.type.name === 'bulletList') {
        mainList = node;
        return false;
      }
      return true;
    });
  }

  if (!mainList) {
    return null; // A list structure is required to build the hierarchical tree.
  }

  const root: TreeNodeData = {
    id: 'root-title', // A static ID for the root of the tree.
    content: title,
    children: [],
  };

  /**
   * Recursively processes a ProseMirror list node, converting its items into tree nodes.
   * @internal
   */
  function processList(listNode: ProseMirrorNode, parentArray: TreeNodeData[]) {
    listNode.forEach((listItem) => {
      if (listItem.type.name !== 'listItem') return;

      let termParagraph: ProseMirrorNode | undefined;
      let nestedList: ProseMirrorNode | undefined;
      let firstParagraphFallback: ProseMirrorNode | undefined;

      // Find the main content paragraph and any nested list within this list item.
      listItem.forEach((child) => {
        if (child.type.name === 'paragraph') {
          if (child.attrs.role === 'term') {
            termParagraph = child; // Prefer paragraphs explicitly marked with the 'term' role.
          } else if (!firstParagraphFallback) {
            firstParagraphFallback = child; // Otherwise, use the first paragraph found.
          }
        } else if (child.type.name === 'bulletList') {
          nestedList = child;
        }
      });

      const paragraphForContent = termParagraph || firstParagraphFallback;

      if (paragraphForContent) {
        const pos = listItem.attrs.pos;
        if (pos === null || pos === undefined) {
          return; // The position attribute is crucial for creating a stable and unique ID.
        }

        const content = paragraphForContent.textContent.trim() || '(Untitled Node)';
        const newNode: TreeNodeData = {
          id: `node-${pos}`,
          content: content,
          children: [],
        };
        parentArray.push(newNode);

        // If a nested list exists, recurse to process it as children of the current node.
        if (nestedList && newNode.children) {
          processList(nestedList, newNode.children);
        }
      }
    });
  }

  if (root.children) {
    processList(mainList, root.children);
  }

  return root;
}

/**
 * Generates a breadcrumb path string for a node at a given editor position.
 *
 * @remarks
 * This function is critical for providing contextual information, for example, to an AI model
 * that needs to understand the location of a node within the schema's hierarchy. It traverses
 * up the document tree from the specified position, collecting the text content of each
 * parent `listItem` to form a human-readable path like "Grandparent > Parent > Current".
 *
 * @param doc The full ProseMirror document.
 * @param pos The numerical position of the `listItem` node for which to generate the breadcrumb.
 * @returns A string representing the hierarchical path to the node (e.g., "Root > Child > Grandchild").
 */
export function getBreadcrumbForPosition(doc: ProseMirrorNode, pos: number): string {
  const path: string[] = [];
  const resolvedPos = doc.resolve(pos);

  // Traverse up the document tree from the resolved position.
  for (let i = resolvedPos.depth; i > 0; i--) {
    const parentNode = resolvedPos.node(i);

    if (parentNode.type.name === 'listItem') {
      // Find the first paragraph within the list item, which holds its primary content.
      const contentParagraph = parentNode.content.firstChild;
      if (contentParagraph && contentParagraph.textContent.trim()) {
        // Add the content to the front of the path array to build the correct order.
        path.unshift(contentParagraph.textContent.trim());
      }
    }
  }

  if (path.length === 0) {
    return 'Schema Root'; // A default, fallback path if the node is at the root or no path can be constructed.
  }

  return path.join(' > ');
}
