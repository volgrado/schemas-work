import {
  DOMSerializer,
  type Node as ProseMirrorNode,
  type Schema,
} from 'prosemirror-model';

/**
 * Extracts content from a range in the document, serializing each node individually
 * and attaching its document position as a data attribute.
 *
 * @param doc The ProseMirror document node
 * @param startPos The starting position to extract from
 * @param endPos The ending position to extract to
 * @param schema The ProseMirror schema
 * @returns An HTML string with data-pos attributes injected
 */
export function extractContentWithPositions(
  doc: ProseMirrorNode,
  startPos: number,
  endPos: number,
  schema: Schema
): string {
  const serializer = DOMSerializer.fromSchema(schema);
  const container = document.createElement('div');

  doc.nodesBetween(startPos, endPos, (node, pos) => {
    // Skip the container node itself if it matches startPos exactly (unless it's an isolated node)
    // But usually nodesBetween gives us the children if we pass the range correctly.
    // We only want top-level nodes within the range (paragraphs, lists, etc.)

    if (pos < startPos) return true; // Enter children

    // We only care about block nodes that can be read
    if (node.isBlock) {
      const dom = serializer.serializeNode(node);
      if (dom instanceof HTMLElement) {
        dom.setAttribute('data-pos', pos.toString());
        container.appendChild(dom);
      } else if (dom instanceof DocumentFragment) {
        // If it returns a fragment, we wrap it or append children
        // But usually serializeNode returns an HTMLElement for block nodes
        const wrapper = document.createElement('div');
        wrapper.appendChild(dom);
        wrapper.setAttribute('data-pos', pos.toString());
        container.appendChild(wrapper);
      }
      return false; // Don't descend into children, we serialized the whole block
    }
    return false;
  });

  return (
    container.innerHTML ||
    '<p class="text-muted">No content under this heading.</p>'
  );
}
