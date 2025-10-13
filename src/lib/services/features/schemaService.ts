import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/types/tree';

/**
 * Service containing the business logic for interpreting and transforming
 * the structure of a schema document (ProseMirror/Tiptap).
 */

/**
 * Converts a full ProseMirror document into a hierarchical data structure
 * (TreeNodeData), ideal for consumption by UI components like a tree view.
 * @param {ProseMirrorNode | null} doc The root node of the ProseMirror document (from editor.state.doc).
 * @returns {TreeNodeData | null} A TreeNodeData object representing the schema hierarchy, or null if it cannot be generated.
 */
export function documentToTreeData(
  doc: ProseMirrorNode | null,
): TreeNodeData | null {
  if (!doc || doc.childCount === 0) {
    return null;
  }

  let title = 'Schema (untitled)';
  doc.descendants((node) => {
    if (node.type.name === 'heading' && node.attrs.level === 2) {
      if (node.textContent.trim()) {
        title = node.textContent.trim();
        return false; // Stop searching once found
      }
    }
    return true;
  });

  let mainList: ProseMirrorNode | undefined;
  const topLevelLists: ProseMirrorNode[] = [];
  doc.forEach((node) => {
    if (node.type.name === 'bulletList') {
      topLevelLists.push(node);
    }
  });

  if (topLevelLists.length > 0) {
    mainList = topLevelLists.reduce((prev, current) =>
      prev.childCount > current.childCount ? prev : current,
    );
  } else {
    doc.descendants((node) => {
      if (mainList) return false;
      if (node.type.name === 'bulletList') {
        mainList = node;
        return false;
      }
      return true;
    });
  }

  if (!mainList) {
    return null;
  }

  const root: TreeNodeData = {
    id: 'root-title',
    content: title,
    children: [],
  };

  function processList(listNode: ProseMirrorNode, parentArray: TreeNodeData[]) {
    listNode.forEach((listItem) => {
      if (listItem.type.name !== 'listItem') return;

      let termParagraph: ProseMirrorNode | undefined;
      let nestedList: ProseMirrorNode | undefined;
      let firstParagraphFallback: ProseMirrorNode | undefined;

      listItem.content.forEach((child) => {
        if (child.type.name === 'paragraph') {
          if (child.attrs.role === 'term') {
            termParagraph = child;
          } else if (!firstParagraphFallback) {
            firstParagraphFallback = child;
          }
        } else if (child.type.name === 'bulletList') {
          nestedList = child;
        }
      });

      const paragraphForContent = termParagraph || firstParagraphFallback;

      if (paragraphForContent) {
        const pos = listItem.attrs.pos;
        if (pos === null || pos === undefined) {
          return;
        }

        const content =
          paragraphForContent.textContent.trim() || '(Untitled Node)';
        const newNode: TreeNodeData = {
          id: `node-${pos}`, // Use position for a stable ID
          content: content,
          children: [],
        };
        parentArray.push(newNode);

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
 * Generates a breadcrumb path for a node at a given position.
 * This path is used to provide context to the AI when expanding a node.
 * @param {ProseMirrorNode} doc The full ProseMirror document (from editor.state.doc).
 * @param {number} pos The position of the 'listItem' node for which we want the path.
 * @returns {string} A string like "Main Topic > Sub-topic > Current Concept".
 */
export function getBreadcrumbForPosition(
  doc: ProseMirrorNode,
  pos: number,
): string {
  const path: string[] = [];
  const resolvedPos = doc.resolve(pos);

  for (let i = resolvedPos.depth; i > 0; i--) {
    const parentNode = resolvedPos.node(i);

    if (parentNode.type.name === 'listItem') {
      const termParagraph = parentNode.content.firstChild;
      if (termParagraph && termParagraph.textContent.trim()) {
        path.unshift(termParagraph.textContent.trim());
      }
    }
  }

  if (path.length === 0) {
    return 'Schema Root';
  }

  return path.join(' > ');
}
