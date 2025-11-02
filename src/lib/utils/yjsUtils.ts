import * as Y from 'yjs';

// --- SHARED TYPES ---
// Define a comprehensive type for a ProseMirror node in JSON format. Both functions will use this.
export interface ProseMirrorJSONNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ProseMirrorJSONNode[];
  text?: string;
}

// Define the shape of the top-level ProseMirror document.
export interface ProseMirrorJSONDocument {
  type: 'doc';
  content: ProseMirrorJSONNode[];
}

// --- YOUR EXISTING FUNCTION (Now strongly typed) ---
/**
 * Converts an array of ProseMirror JSON nodes into a Y.XmlFragment.
 * This is used for writing ProseMirror data INTO Y.js.
 */
export function prosemirrorJsonToYXmlFragment(
  nodes: ProseMirrorJSONNode[]
): Y.XmlFragment {
  const fragment = new Y.XmlFragment();

  nodes.forEach((node) => {
    if (node.text) {
      // For text nodes, create a Y.XmlText
      const textNode = new Y.XmlText(node.text);
      // Here you could add marks as formatting attributes if needed
      fragment.push([textNode]);
    } else {
      // For element nodes, create a Y.XmlElement
      const element = new Y.XmlElement(node.type);

      if (node.attrs) {
        Object.entries(node.attrs).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            element.setAttribute(key, value);
          }
        });
      }

      if (node.content) {
        // Recursively convert children and insert them
        const nestedFragment = prosemirrorJsonToYXmlFragment(node.content);
        const children = nestedFragment
          .toArray()
          .filter(
            (child): child is Y.XmlElement | Y.XmlText =>
              child instanceof Y.XmlElement || child instanceof Y.XmlText
          );
        element.insert(0, children);
      }

      fragment.push([element]);
    }
  });

  return fragment;
}

// --- THE NEW FUNCTION THAT searchService NEEDS ---
/**
 * Converts a Y.js document's 'prosemirror' XmlFragment into a standard
 * ProseMirror JSON document structure.
 * This is used for reading ProseMirror data FROM Y.js.
 * @param ydoc The Y.js document.
 * @returns A ProseMirror JSON document.
 */
export function yXmlFragmentToProsemirrorJson(
  ydoc: Y.Doc
): ProseMirrorJSONDocument {
  const fragment = ydoc.getXmlFragment('prosemirror');

  // The .toJSON() method on a Y.XmlFragment returns an array of its children's JSON representations.
  const content = (fragment.toJSON() || []) as ProseMirrorJSONNode[];

  return {
    type: 'doc',
    content: content,
  };
}
