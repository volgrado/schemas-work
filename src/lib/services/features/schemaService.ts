// src/lib/services/features/schemaService.ts (VERSIÓN FINAL CON CORRECCIONES DE TIPO)
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/types/tree';

export function documentToTreeData(
  doc: ProseMirrorNode | null
): TreeNodeData | null {
  if (!doc || doc.childCount === 0) {
    return null;
  }

  // --- 1. Title Discovery (Looks for H2) ---
  let title = 'Esquema (sin título)';
  doc.descendants((node) => {
    if (node.type.name === 'heading' && node.attrs.level === 2) {
      if (node.textContent.trim()) {
        title = node.textContent.trim();
        return false;
      }
    }
    return !title || title === 'Esquema (sin título)';
  });

  // --- 2. Smart List Selection ---
  let mainList: ProseMirrorNode | undefined;
  const topLevelLists: ProseMirrorNode[] = [];
  doc.forEach((node) => {
    if (node.type.name === 'bulletList') {
      topLevelLists.push(node);
    }
  });

  if (topLevelLists.length > 0) {
    mainList = topLevelLists.reduce((prev, current) =>
      prev.childCount > current.childCount ? prev : current
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

  // --- 3. Tree Generation ---
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

      listItem.forEach((child) => {
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
          paragraphForContent.textContent.trim() || '(Nodo sin título)';
        const newNode: TreeNodeData = {
          id: `node-${pos}`,
          content: content,
          children: [],
        };
        parentArray.push(newNode);

        // ✅ (FIX 1) The check `newNode.children` is crucial here. It proves to
        // TypeScript that the argument is not undefined before the recursive call.
        if (nestedList && newNode.children) {
          processList(nestedList, newNode.children);
        }
      }
    });
  }

  // ✅ (FIX 2) Re-added the necessary check for `root.children`. This satisfies
  // the compiler and ensures we don't pass `undefined` to `processList`.
  if (root.children) {
    processList(mainList, root.children);
  }

  if (root.children && root.children.length === 0) {
    console.log(
      '[schemaService] The main list is empty. Returning a root node with no children.'
    );
  }

  console.log('[schemaService] Successfully generated tree data:', root);
  return root;
}
