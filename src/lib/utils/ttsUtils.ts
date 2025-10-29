/**
 * @file Provides utility functions for the Text-to-Speech feature.
 * This module is designed to hold pure functions that can be shared
 * across different stores without creating circular dependencies.
 * @module ttsUtils
 */

import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * Describes a parseable node from the editor document for TTS playback or download.
 */
export interface ReadableNode {
  /** The starting position of the node in the ProseMirror document. */
  pos: number;
  /** The ProseMirror node instance. */
  node: ProseMirrorNode;
  /** A short, display-friendly title for the node (used in the UI). */
  title: string;
  /** The full, cleaned text content that should be sent to the TTS engine. */
  textToSpeak: string;
}

// --- Configuration ---
const SUPPORTED_NODE_TYPES = ['heading', 'listItem', 'paragraph'];
const TITLE_MAX_LENGTH = 60;
const ELLIPSIS = '…'; // Using a proper ellipsis character

/**
 * A robust text cleaning function for better speech synthesis.
 * - Replaces multiple whitespace characters (including newlines) with a single space.
 * - Trims leading/trailing whitespace.
 * @param text The raw text content from a node.
 * @returns Cleaned text.
 */
function cleanTextForSpeech(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
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
  return text.substring(0, TITLE_MAX_LENGTH) + ELLIPSIS;
}

/**
 * Processes a single ProseMirror node to determine if it's readable
 * and transforms it into a ReadableNode.
 * @param node The ProseMirror node.
 * @param pos The position of the node in the document.
 * @returns A ReadableNode object, or null if the node should be skipped.
 */
function processNode(node: ProseMirrorNode, pos: number): ReadableNode | null {
  if (!SUPPORTED_NODE_TYPES.includes(node.type.name)) {
    return null;
  }

  const fullText = cleanTextForSpeech(node.textContent);
  if (!fullText) {
    return null; // Skip nodes with no actual content.
  }

  let title = '';
  let textToSpeak = '';

  switch (node.type.name) {
    case 'heading':
      title = fullText;
      textToSpeak = fullText;
      break;

    case 'paragraph':
      title = fullText; // For paragraphs, the title is simply a truncated version of the content.
      textToSpeak = fullText;
      break;

    case 'listItem': {
      // For list items, treat the first paragraph as the "title" part.
      const firstChildText = node.firstChild
        ? cleanTextForSpeech(node.firstChild.textContent)
        : '';

      if (firstChildText && fullText.length > firstChildText.length) {
        // There is more content after the first line.
        title = firstChildText;
        // Add a period for a natural pause if the "title" part doesn't have punctuation.
        const titleEndsWithPunctuation = /[.?!]$/.test(title);
        textToSpeak = titleEndsWithPunctuation
          ? fullText
          : `${title}. ${fullText.substring(title.length).trim()}`;
      } else {
        // The list item is a single line.
        title = fullText;
        textToSpeak = fullText;
      }
      break;
    }

    default:
      // This case should not be hit due to the initial check, but it's good practice.
      return null;
  }

  return {
    pos,
    node,
    title: truncateTitle(title),
    textToSpeak,
  };
}

/**
 * Parses the editor's document to extract a flat list of nodes
 * that can be read aloud (headings, paragraphs, and list items).
 * It cleans and formats the text for a more natural-sounding speech synthesis.
 *
 * @param editor The Tiptap editor instance.
 * @returns An array of ReadableNode objects.
 */
export function getReadableNodes(editor: Editor): ReadableNode[] {
  const nodes: ReadableNode[] = [];

  editor.state.doc.descendants((node, pos) => {
    const readableNode = processNode(node, pos);
    if (readableNode) {
      nodes.push(readableNode);
    }

    // Do not descend into children of list items, as we process the whole item at once.
    return node.type.name !== 'listItem';
  });

  return nodes;
}
