/**
 * @file Provides business logic for interpreting and transforming schema documents.
 */
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TreeNodeData } from '$lib/components/tree/SchemaTree.svelte';

/**
 * Converts a ProseMirror document object into a hierarchical tree structure.
 */
export function documentToTreeData(
  doc: ProseMirrorNode | null
): TreeNodeData | null {
  console.log(
    '%c[schemaService] Starting documentToTreeData...',
    'color: purple; font-weight: bold;'
  );

  if (!doc || doc.childCount === 0) {
    console.warn('[schemaService] Document is null or empty. Returning null.');
    return null;
  }

  let title = 'Schema (untitled)';
  doc.descendants((node) => {
    if (
      node.type.name === 'heading' &&
      node.attrs.level === 1 &&
      node.textContent.trim()
    ) {
      title = node.textContent.trim();
      return false; // Stop searching once found
    }
    return true;
  });
  console.log(`[schemaService] Found title: "${title}"`);

  // --- THIS IS THE ROBUST FIX ---
  // Search the entire document for the first bulletList, don't just check top-level nodes.
  let mainList: ProseMirrorNode | undefined;
  doc.descendants((node) => {
    if (mainList) return false; // Stop once we've found the first one
    if (node.type.name === 'bulletList') {
      mainList = node;
      return false;
    }
    return true;
  });

  if (!mainList) {
    console.error(
      '[schemaService] CRITICAL: No bulletList found anywhere in the document. Cannot build tree. Returning null.'
    );
    return null;
  }
  console.log(
    '[schemaService] Found main bulletList to process:',
    mainList.toJSON()
  );

  const root: TreeNodeData = {
    id: 'root-title',
    content: title,
    children: [],
  };

  /**
   * Recursively processes a ProseMirror list node, converting its items into tree nodes.
   */
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
        const nodeId = listItem.attrs.nodeId;
        if (!nodeId) {
          console.warn('SKIPPING: List item is missing nodeId attribute.');
          return;
        }

        const content =
          paragraphForContent.textContent.trim() || '(Untitled Node)';
        const newNode: TreeNodeData = {
          id: nodeId,
          content: content,
          children: [],
        };
        parentArray.push(newNode);

        if (nestedList && newNode.children) {
          processList(nestedList, newNode.children!); // The '!' fixes the TypeScript error
        }
      } else {
        console.warn('SKIPPING: No suitable paragraph found inside listItem.');
      }
    });
  }

  if (root.children) {
    processList(mainList, root.children);
  }

  console.log(
    '%c[schemaService] Finished. Final tree data:',
    'color: green; font-weight: bold;',
    JSON.parse(JSON.stringify(root))
  );
  return root;
}

/**
 * Generates a breadcrumb path string for a node at a given editor position.
 */
export function getBreadcrumbForPosition(
  doc: ProseMirrorNode,
  pos: number
): string {
  const path: string[] = [];
  const resolvedPos = doc.resolve(pos);

  for (let i = resolvedPos.depth; i > 0; i--) {
    const parentNode = resolvedPos.node(i);
    if (parentNode.type.name === 'listItem') {
      const contentParagraph = parentNode.content.firstChild;
      if (contentParagraph && contentParagraph.textContent.trim()) {
        path.unshift(contentParagraph.textContent.trim());
      }
    }
  }

  if (path.length === 0) {
    return 'Schema Root';
  }

  return path.join(' > ');
}
