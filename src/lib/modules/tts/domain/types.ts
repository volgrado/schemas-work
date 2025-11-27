/**
 * @file types.ts
 * @module tts
 * @description
 * Defines the domain types for the Text-to-Speech (TTS) module.
 */

import type { Node as ProseMirrorNode } from 'prosemirror-model';

export namespace TTS {
  /**
   * Represents a single, readable segment of the document, enriched with
   * hierarchical context for a cinematic reading experience.
   */
  export interface ReadableNode {
    id: number;
    pos: number;
    node: ProseMirrorNode;
    title: string;
    text: string;
    /** For headings, this links directly to the corresponding node in the TreeView visualization. */
    treeNodeId?: string;
    /** The hierarchical index of this node (e.g., "1.2", "3.1.4"). */
    hierarchicalIndex: string;
    /** For any node (heading or paragraph), this is the ID of the containing heading section. */
    parentHeadingId?: string;
  }

  export interface Voice {
    id: string;
    name: string;
    lang: string;
  }

  export type Status =
    | 'idle'
    | 'initializing'
    | 'awaiting_download'
    | 'playing'
    | 'paused'
    | 'error';
}
