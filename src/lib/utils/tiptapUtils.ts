/**
 * @file Provides utility functions for working with Tiptap JSON content.
 * @module tiptapUtils
 */

import type { JSONContent } from '@tiptap/core';

/**
 * Ensures that the content received from an AI is a valid Tiptap document structure.
 *
 * AI models often return a valid array of nodes but forget to wrap them in the
 * required root `{ "type": "doc", "content": [...] }` object. This function
 * checks for the most common malformations and corrects them, making the system
 * more robust and preventing the Tiptap editor from failing to render content.
 *
 * @param content The raw, potentially malformed JSON content received from the AI.
 * @returns A valid Tiptap JSONContent object that is safe to pass to the Tiptap editor.
 */
export function normalizeTiptapJSON(content: any): JSONContent {
  // If the content is null, undefined, or not an object, it's invalid.
  // Return a safe, empty Tiptap document to prevent crashes.
  if (!content || typeof content !== 'object') {
    console.warn(
      'Invalid content received. Normalizing to an empty document.',
      content
    );
    return { type: 'doc', content: [] };
  }

  // Case 1: The AI returned a perfect Tiptap document. No changes needed.
  if (content.type === 'doc' && Array.isArray(content.content)) {
    return content as JSONContent;
  }

  // Case 2: The AI returned just an array of nodes. This is the most common error.
  // We wrap it in the required `doc` object.
  if (Array.isArray(content)) {
    return { type: 'doc', content: content };
  }

  // Case 3: The AI wrapped the array in a "content" property but forgot the "type: 'doc'".
  // We add the missing "type" property.
  if (Array.isArray(content.content)) {
    return { type: 'doc', content: content.content };
  }

  // Fallback: If the structure is unrecognized, return an empty document.
  // This is a crucial safety net to prevent the application from breaking.
  console.warn(
    'Unrecognized Tiptap JSON structure. Normalizing to an empty document.',
    content
  );
  return { type: 'doc', content: [] };
}
