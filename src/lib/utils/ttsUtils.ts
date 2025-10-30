/**
 * @file Provides utility functions for the Text-to-Speech feature.
 * This module is designed to hold pure functions that can be shared
 * across different stores without creating circular dependencies.
 * @module ttsUtils
 */

import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

// --- FIX APPLIED: Import the shared ReadableNode type from the central types file ---
import type { ReadableNode } from '$lib/types';

// --- Configuration ---
const SUPPORTED_NODE_TYPES = ['heading', 'listItem', 'paragraph'];
const TITLE_MAX_LENGTH = 60;
const ELLIPSIS = '…';

/**
 * An enhanced text cleaning function for superior speech synthesis.
 * - Normalizes whitespace.
 * - Strips common Markdown formatting characters.
 * - Handles URLs gracefully.
 * @param text The raw text content from a node.
 * @returns Cleaned text optimized for TTS.
 */
function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Handle URLs first
  cleaned = cleaned.replace(/(https?:\/\/[^\s]+)/g, 'link');
  // Strip Markdown
  cleaned = cleaned.replace(/([*_`~=])/g, '');
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Truncates a string to a max length and adds an ellipsis if needed.
 * @param text The text to truncate.
 * @returns A truncated string suitable for UI display.
 */
function truncateTitle(text: string): string {
  if (text.length <= TITLE_MAX_LENGTH) {
    return text;
  }
  return text.substring(0, TITLE_MAX_LENGTH).trim() + ELLIPSIS;
}

/**
 * Processes a single ProseMirror node to determine if it's readable
 * and transforms it into a partial ReadableNode.
 * @param node The ProseMirror node.
 * @param pos The position of the node in the document.
 * @returns A partial ReadableNode object (without an 'id'), or null if the node should be skipped.
 */
function processNode(
  node: ProseMirrorNode,
  pos: number
): Omit<ReadableNode, 'id'> | null {
  if (!SUPPORTED_NODE_TYPES.includes(node.type.name)) {
    return null;
  }

  const fullText = cleanTextForSpeech(node.textContent);
  if (!fullText) {
    return null;
  }

  let title = '';
  let textToSpeak = '';

  switch (node.type.name) {
    case 'heading':
      title = fullText;
      textToSpeak = fullText;
      break;

    case 'paragraph':
      title = fullText;
      textToSpeak = fullText;
      break;

    case 'listItem': {
      const firstChildText = node.firstChild
        ? cleanTextForSpeech(node.firstChild.textContent)
        : '';
      if (firstChildText && fullText.length > firstChildText.length) {
        title = firstChildText;
        const titleEndsWithPunctuation = /[.?!]$/.test(title);
        textToSpeak = titleEndsWithPunctuation
          ? fullText
          : `${title}. ${fullText.substring(title.length).trim()}`;
      } else {
        title = fullText;
        textToSpeak = fullText;
      }
      break;
    }

    default:
      return null;
  }

  // --- FIX APPLIED: Return an object that matches the shared ReadableNode type (minus the 'id') ---
  return {
    pos,
    node,
    title: truncateTitle(title),
    text: textToSpeak, // Use the 'text' property as the primary field
    textToSpeak: textToSpeak, // Keep 'textToSpeak' for compatibility if needed, but 'text' is better.
  };
}

/**
 * Parses the editor's document to extract a flat list of nodes
 * that can be read aloud (headings, paragraphs, and list items).
 * It cleans and formats the text for a more natural-sounding speech synthesis.
 *
 * @param editor The Tiptap editor instance.
 * @returns An array of `ReadableNode` objects that conform to the central type definition.
 */
export function getReadableNodes(editor: Editor): ReadableNode[] {
  const nodes: ReadableNode[] = [];

  editor.state.doc.descendants((node, pos) => {
    // processNode now returns a partial object without an 'id'
    const partialNode = processNode(node, pos);

    if (partialNode) {
      // --- FIX APPLIED: We construct the final, valid ReadableNode here ---
      // This ensures it has all required properties, including the 'id'.
      nodes.push({
        ...partialNode,
        id: nodes.length, // The ID is simply the node's index in the final playlist.
      });
    }

    // Do not descend into children of list items, as we process the whole item at once.
    return node.type.name !== 'listItem';
  });

  return nodes;
}
