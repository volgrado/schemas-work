/**
 * @file Provides strongly-typed utility functions to convert between ProseMirror's JSON format and Y.js XML Fragments.
 * @module prosemirror-yjs-utility
 */

import * as Y from 'yjs';
import { yDocToProsemirrorJSON, prosemirrorJSONToYDoc } from 'y-prosemirror';

import { schema } from '$lib/modules/editor/domain/schema';

// --- SHARED TYPES ---
// Define a comprehensive type for a ProseMirror node in JSON format.
export interface ProseMirrorJSONNode {
  type: string;
  attrs?: Record<string, any>;
  content?: ProseMirrorJSONNode[];
  text?: string;
  marks?: any[]; // It's good practice to include marks for rich text
}

// Define the shape of the top-level ProseMirror document.
export interface ProseMirrorJSONDocument {
  type: 'doc';
  content: ProseMirrorJSONNode[];
}

/**
 * Converts a ProseMirror JSON document object into a Y.js document.
 * This is used for writing ProseMirror data INTO Y.js, for example, when creating a new document with initial content.
 * NOTE: This function replaces the original `prosemirrorJsonToYXmlFragment` with a more robust implementation.
 * It populates the default 'prosemirror' fragment inside the Y.Doc.
 *
 * @param prosemirrorJson The ProseMirror document in JSON format.
 * @returns A new Y.Doc containing the converted content.
 */
export function prosemirrorJsonToYDoc(
  prosemirrorJson: ProseMirrorJSONDocument
): Y.Doc {
  // The second argument is the name of the shared type, which is 'prosemirror' by default in Tiptap.
  return prosemirrorJSONToYDoc(schema, prosemirrorJson);
}

/**
 * (FIXED) Converts a Y.js document's 'prosemirror' XmlFragment into a standard
 * ProseMirror JSON document structure.
 * This function uses the official, tested utility from the y-prosemirror library,
 * which correctly handles the conversion and prevents data loss.
 *
 * @param ydoc The Y.js document.
 * @returns A ProseMirror JSON document.
 */
export function yDocToProsemirrorJson(ydoc: Y.Doc): ProseMirrorJSONDocument {
  // Use the official utility from y-prosemirror for a reliable conversion.
  // The second argument, 'prosemirror', is the name of the top-level shared type
  // that Tiptap's collaboration extension uses by default.
  return yDocToProsemirrorJSON(
    ydoc,
    'prosemirror'
  ) as unknown as ProseMirrorJSONDocument;
}
