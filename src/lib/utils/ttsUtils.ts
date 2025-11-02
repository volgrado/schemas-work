/**
 * @file Provides utility functions for the Text-to-Speech feature.
 * This module is designed to hold pure functions that can be shared
 * across different stores without creating circular dependencies.
 * @module ttsUtils
 */

import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { ReadableNode } from '$lib/types';

// --- Configuration ---
// UPDATED: We now only process headings and paragraphs for the main playlist.
const SUPPORTED_NODE_TYPES = ['heading', 'paragraph'];
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
  // SIMPLIFIED: Check if the node is a type we want in our playlist.
  if (!SUPPORTED_NODE_TYPES.includes(node.type.name)) {
    return null;
  }

  const fullText = cleanTextForSpeech(node.textContent);
  if (!fullText) {
    return null;
  }

  // SIMPLIFIED: For both headings and paragraphs, the title and the text to speak
  // are the same. The complex logic for listItems is no longer needed.
  const title = fullText;
  const textToSpeak = fullText;

  return {
    pos,
    node,
    title: truncateTitle(title),
    text: textToSpeak,
    textToSpeak: textToSpeak,
  };
}

/**
 * Parses the editor's document to extract a flat list of nodes
 * that can be read aloud (headings and paragraphs). It creates a simple,
 * linear playlist of the document's content.
 *
 * @param editor The Tiptap editor instance.
 * @returns An array of `ReadableNode` objects.
 */
export function getReadableNodes(editor: Editor): ReadableNode[] {
  const nodes: ReadableNode[] = [];

  editor.state.doc.descendants((node, pos) => {
    const partialNode = processNode(node, pos);

    if (partialNode) {
      nodes.push({
        ...partialNode,
        id: nodes.length, // The ID is simply the node's index in the final playlist.
      });
    }

    // SIMPLIFIED: Always return true. The special rule for not descending
    // into listItems is obsolete. We want to visit every node.
    return true;
  });

  return nodes;
}
