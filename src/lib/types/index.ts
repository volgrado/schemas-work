/**
 * @file Centralizes all custom type and interface definitions for the application.
 * @module types
 */

// --- Svelte & Tiptap Imports for Type Augmentation ---
import type { IconName } from './iconName';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { JSONContent } from '@tiptap/core';

// =================================================================
// --- Global & Primitive Types ---
// =================================================================

export type Provider = 'gemini';

// =================================================================
// --- Core Data Structures ---
// =================================================================

export interface Identity {
  publicKey: string;
  privateKey: string;
}

export interface SchemaMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  type: 'schema' | 'folder';
  parentId: string | null;
}

export interface Vault {
  schemas: SchemaMetadata[];
  content: Record<string, string>;
}

// =================================================================
// --- Spaced Repetition System (SRS) Namespace ---
// =================================================================

export namespace SRS {
  export type ReviewQuality = 0 | 3 | 4 | 5;

  export interface Data {
    easeFactor: number;
    interval: number;
    repetitions: number;
    dueDate: number;
    learningStep: number;
  }

  export type CardType = 'basic' | 'input' | 'sequencing';

  interface CardBase {
    id: string;
    deckId: string;
    srs: Data;
    tags: string[];
    suspended: boolean;
  }

  export interface BasicCard extends CardBase {
    type: 'basic';
    content: { question: string; answer: string };
  }

  export interface InputCard extends CardBase {
    type: 'input';
    content: { prompt: string; expected: string };
  }

  export interface SequencingCard extends CardBase {
    type: 'sequencing';
    content: { prompt: string; items: string[] };
  }

  export type Card = BasicCard | InputCard | SequencingCard;

  export type NewCard =
    | Omit<BasicCard, 'id' | 'deckId'>
    | Omit<InputCard, 'id' | 'deckId'>
    | Omit<SequencingCard, 'id' | 'deckId'>;
}

// =================================================================
// --- UI & Interaction Namespaces ---
// =================================================================

export namespace Search {
  export interface Command {
    id: string;
    label: string;
    icon: IconName;
    action: (event?: MouseEvent) => void | Promise<void>;
    isEnabled?: () => boolean;
  }

  export interface ContentResult {
    docId: string;
    title: string;
    snippet: string;
    score: number;
    path?: string;
    nodeId?: string;
  }

  export type ResultItem = ContentResult | Command;

  export interface ResultGroup {
    type: 'Knowledge' | 'Commands';
    items: ResultItem[];
  }
}

/** Types related to all modal dialogs in the application. */
export namespace Modal {
  /** Configuration for the formula editing modal. */
  export interface FormulaConfig {
    type: 'formula';
    nodePos: number;
    nodeType: 'math_block' | 'math_inline';
    initialFormula: string;
    onsave?: (formula: string) => void;
  }

  /** Configuration for the media (image or YouTube) editing modal. */
  export interface MediaConfig {
    type: 'media';
    nodeType: 'image' | 'youtube';
    nodePos: number;
    attrs: Record<string, any>;
  }

  /** Configuration for the AI Strategy Session modal. */
  export interface StrategySessionConfig {
    type: 'strategy_session';
    action: string;
    fullDocumentJSON?: JSONContent;
    fullDocumentText?: string;
    selectedText?: string;
  }

  /** A discriminated union of all possible modal configurations. */
  export type Config = FormulaConfig | MediaConfig | StrategySessionConfig;
}

// =================================================================
// --- Feature-Specific Namespaces ---
// =================================================================

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

export namespace Viz {
  export interface TreeNode {
    id: string;
    content: string;
    children?: TreeNode[];
  }
}
