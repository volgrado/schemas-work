/**
 * @file Core data migration service.
 * @module migrationService
 *
 * @remarks
 * This service contains the essential logic for upgrading the document schema from the old
 * list-based structure to the new, flat, heading-based structure. This is a one-time
 * operation that will be run on-the-fly for users loading old documents.
 */

// Define basic types for Tiptap JSON for clarity.
type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
};

type TiptapDocument = {
  type: 'doc';
  content: TiptapNode[];
};

/**
 * Recursively processes a Tiptap `bulletList` node and transforms its `listItem` children
 * into a flat array of heading, paragraph, and other preserved nodes.
 *
 * @param listNode - The `bulletList` node to process.
 * @param depth - The current nesting depth, used to calculate heading levels (h2, h3, etc.).
 * @param flatNodes - The output array where new nodes are pushed.
 * @internal
 */
function processList(
  listNode: TiptapNode,
  depth: number,
  flatNodes: TiptapNode[]
): void {
  if (listNode.type !== 'bulletList' || !listNode.content) return;

  listNode.content.forEach((listItem: TiptapNode) => {
    if (listItem.type !== 'listItem' || !listItem.content) return;

    let termPara: TiptapNode | undefined;
    let descPara: TiptapNode | undefined;
    let nestedList: TiptapNode | undefined;
    const otherContent: TiptapNode[] = [];

    // Separate the children of the listItem into their designated roles to handle any order.
    listItem.content.forEach((child: TiptapNode) => {
      if (child.type === 'paragraph' && child.attrs?.role === 'term') {
        termPara = child;
      } else if (
        child.type === 'paragraph' &&
        child.attrs?.role === 'description'
      ) {
        descPara = child;
      } else if (child.type === 'bulletList') {
        nestedList = child;
      } else {
        // AUDIT POINT: This captures and preserves images, math blocks, regular paragraphs, etc.
        otherContent.push(child);
      }
    });

    // 1. Convert the 'term' paragraph into a new heading.
    if (termPara) {
      const headingNode: TiptapNode = {
        type: 'heading',
        attrs: {
          // Top-level items become h2, nested items become h3, etc.
          level: depth + 1,
          // CRITICAL: Transfer the nodeId from the listItem to preserve all associations.
          nodeId: listItem.attrs?.nodeId || null,
        },
        content: termPara.content || [],
      };
      flatNodes.push(headingNode);
    }

    // 2. Convert the 'description' paragraph into a standard paragraph (stripping the role).
    if (descPara) {
      const descriptionNode: TiptapNode = {
        type: 'paragraph',
        attrs: {}, // The 'role' attribute is now obsolete.
        content: descPara.content || [],
      };
      flatNodes.push(descriptionNode);
    }

    // 3. AUDIT POINT: Preserve all other content and place it after the description.
    //    This ensures images, math blocks, etc., are not lost during migration.
    flatNodes.push(...otherContent);

    // 4. If a nested list exists, recurse with an incremented depth.
    if (nestedList) {
      processList(nestedList, depth + 1, flatNodes);
    }
  });
}

/**
 * Converts a Tiptap JSON document from the old list-based format to the new heading-based format.
 * This function is the heart of the schema migration.
 *
 * @param docJson - The entire Tiptap JSON object for the old document.
 * @returns A new `content` array for the document body, ready to be inserted into a Y.Doc.
 */
export function convertListToHeadings(docJson: TiptapDocument): TiptapNode[] {
  if (!docJson || docJson.type !== 'doc' || !docJson.content) {
    console.error('Migration Error: Invalid document JSON provided.');
    return [];
  }

  const newFlatContent: TiptapNode[] = [];
  let mainListFound = false;

  // This function only processes the *body* of the document. The H1 title
  // is handled by the calling function in `documentStore`. We find the first
  // top-level bulletList and convert it.
  docJson.content.forEach((node) => {
    if (node.type === 'bulletList' && !mainListFound) {
      mainListFound = true;
      // Start recursion at depth 1, so the first level of items becomes <h2>.
      processList(node, 1, newFlatContent);
    }
  });

  if (!mainListFound) {
    console.warn(
      'Migration Warning: No top-level bulletList found to migrate.'
    );
  }

  return newFlatContent;
}
