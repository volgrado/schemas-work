/**
 * @file Provides utility functions for the Text-to-Speech feature.
 * This module is designed to hold pure functions that can be shared
 * across different stores without creating circular dependencies.
 * @module ttsUtils
 */

import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { TTS } from '$lib/types';

// --- Configuration ---
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
 * Parses the editor's document to extract a structured list of nodes
 * that can be read aloud. It generates hierarchical numbering and links
 * paragraphs to their parent headings.
 *
 * @param editor The Tiptap editor instance.
 * @returns An array of `TTS.ReadableNode` objects with hierarchical context.
 */
export function getReadableNodes(editor: Editor): TTS.ReadableNode[] {
  const nodes: TTS.ReadableNode[] = [];
  if (!editor) return nodes;

  // This array tracks the current count for each heading level (h1, h2, h3, etc.)
  const headingCounters = [0, 0, 0, 0, 0, 0];
  // This object holds the context of the current section.
  let currentHeadingInfo: { id: string | undefined; index: string } = {
    id: undefined,
    index: '0',
  };

  // Iterate through every top-level node in the document.
  editor.state.doc.forEach((node: ProseMirrorNode, pos: number) => {
    const nodeType = node.type.name;
    const textContent = cleanTextForSpeech(node.textContent);

    if (!textContent) {
      return; // Skip empty nodes
    }

    if (nodeType === 'heading') {
      const level = node.attrs.level; // e.g., 1 for h1, 2 for h2

      // Increment the counter for the current heading level.
      headingCounters[level - 1]++;

      // Reset all counters for deeper levels to ensure correct numbering.
      // e.g., after a new H2, the H3/H4 counters must reset to 0.
      for (let i = level; i < headingCounters.length; i++) {
        headingCounters[i] = 0;
      }

      // Create the hierarchical index string (e.g., "2", "2.1", "3.1.4").
      const hierarchicalIndex = headingCounters.slice(0, level).join('.');
      const nodeId = node.attrs.nodeId;

      // Update the "current section" information.
      currentHeadingInfo = { id: nodeId, index: hierarchicalIndex };

      nodes.push({
        id: nodes.length,
        pos,
        node,
        title: truncateTitle(textContent),
        text: textContent,
        treeNodeId: nodeId,
        hierarchicalIndex: hierarchicalIndex,
        parentHeadingId: nodeId, // A heading is its own parent in this context
      });
    } else if (nodeType === 'paragraph') {
      // Paragraphs belong to the last seen heading.
      nodes.push({
        id: nodes.length,
        pos,
        node,
        title: truncateTitle(textContent),
        text: textContent,
        treeNodeId: undefined, // Paragraphs don't have a direct tree node
        // Paragraphs inherit the hierarchical index of their parent heading.
        hierarchicalIndex: currentHeadingInfo.index,
        // Link the paragraph back to its parent heading's unique ID.
        parentHeadingId: currentHeadingInfo.id,
      });
    }
  });

  return nodes;
}
