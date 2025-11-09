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

/**
 * Recursively scans a Tiptap JSON object for text nodes containing KaTeX
 * delimiters and replaces them with the appropriate Tiptap math nodes.
 *
 * This is the crucial post-processing step that transforms AI-generated text
 * like "The formula is \( E = mc^2 \)." into a structured format that Tiptap
 * can render using your custom math components.
 *
 * @param node The Tiptap JSON node to process.
 * @returns The processed Tiptap JSON node with KaTeX text converted to math nodes.
 */
export function postProcessKaTeX(node: JSONContent): JSONContent {
  // If the node has no content array, we can't process its children, so we return it as is.
  if (!node.content) {
    return node;
  }

  // We will build a new content array with the processed nodes.
  const newContent: JSONContent[] = [];

  // Recursively process all children first. This ensures we work from the deepest nodes up.
  const processedChildren = node.content.map(postProcessKaTeX);

  for (const child of processedChildren) {
    // We are only interested in text nodes that actually contain text.
    if (child.type === 'text' && child.text) {
      const text = child.text;
      // This regex looks for KaTeX delimiters: `\(` and `\[`
      // It captures the delimiter, the formula content, and the closing delimiter.
      const regex = /(\\\(|\\\[)(.+?)(\\\)|\\\])/g;
      let lastIndex = 0;
      let match;

      // Loop through all matches of the regex in the text.
      while ((match = regex.exec(text)) !== null) {
        // 1. Add any preceding text that is not part of a formula.
        if (match.index > lastIndex) {
          newContent.push({
            type: 'text',
            text: text.slice(lastIndex, match.index),
          });
        }

        // 2. Create the appropriate math node based on the delimiter.
        const delimiterStart = match[1]; // `\(` or `\[`
        const formula = match[2].trim(); // The actual KaTeX source
        const nodeType =
          delimiterStart === '\\(' ? 'math_inline' : 'math_block';

        newContent.push({
          type: nodeType,
          attrs: { formula: formula },
        });

        // Update the index for the next slice of text.
        lastIndex = match.index + match[0].length;
      }

      // 3. Add any remaining text after the last formula has been processed.
      if (lastIndex < text.length) {
        newContent.push({
          type: 'text',
          text: text.slice(lastIndex),
        });
      }
    } else {
      // If the child is not a text node (e.g., it's a heading or paragraph),
      // we add it to our new content array without modification.
      newContent.push(child);
    }
  }

  // Return the original node but with its content replaced by our newly processed array.
  return { ...node, content: newContent };
}
