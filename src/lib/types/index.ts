/**
 * @file Centralizes all custom type and interface definitions for the application.
 * @module types
 */

// --- Svelte & Tiptap Imports for Type Augmentation ---
import type { IconName } from './iconName'; // Assumes iconName.ts is in the same directory
import type { Node as ProseMirrorNode } from 'prosemirror-model';

// =================================================================
// --- Global & Primitive Types ---
// =================================================================

/** Defines the supported AI service providers. */
export type Provider = 'gemini';

// =================================================================
// --- Core Data Structures ---
// =================================================================

/** Represents the user's unique cryptographic identity. */
export interface Identity {
  /** The public part of the cryptographic key pair. */
  publicKey: string;
  /** The private part of the cryptographic key pair. */
  privateKey: string;
}

/** Represents the metadata of a schema or a folder in the directory. */
export interface SchemaMetadata {
  /** The unique identifier for the item. */
  id: string;
  /** The user-defined title of the schema or folder. */
  title: string;
  /** The timestamp when the item was created. */
  createdAt: number;
  /** The timestamp when the item was last modified. */
  updatedAt: number;
  /** The type of the item. */
  type: 'schema' | 'folder';
  /** The ID of the parent folder. `null` if the item is at the root level. */
  parentId: string | null;
}

/** Represents the complete structure of a user's vault, used for import and export. */
export interface Vault {
  /** An array of all schema and folder metadata objects. */
  schemas: SchemaMetadata[];
  /** A key-value map where the key is the schema ID and the value is the Y.js document content. */
  content: Record<string, string>;
}

// =================================================================
// --- Spaced Repetition System (SRS) Namespace ---
// =================================================================

export namespace SRS {
  /** The quality of a user's response during a review session (0: Again, 3: Hard, 4: Good, 5: Easy). */
  export type ReviewQuality = 0 | 3 | 4 | 5;

  /** The core data for the Spaced Repetition System algorithm. */
  export interface Data {
    easeFactor: number;
    interval: number;
    repetitions: number;
    dueDate: number;
    learningStep: number;
  }

  /** A union of all possible card types. */
  export type CardType = 'basic' | 'input' | 'sequencing';

  /** The base interface shared by all card types. */
  interface CardBase {
    id: string;
    deckId: string;
    srs: Data;
    tags: string[];
    suspended: boolean;
  }

  /** A simple question-and-answer card. */
  export interface BasicCard extends CardBase {
    type: 'basic';
    content: { question: string; answer: string };
  }

  /** A card that prompts the user to type in the expected answer. */
  export interface InputCard extends CardBase {
    type: 'input';
    content: { prompt: string; expected: string };
  }

  /** A card that requires the user to order a list of items correctly. */
  export interface SequencingCard extends CardBase {
    type: 'sequencing';
    content: { prompt: string; items: string[] };
  }

  /** A discriminated union representing any possible card type. */
  export type Card = BasicCard | InputCard | SequencingCard;

  /** Represents a new card before it has an ID or deckId. */
  export type NewCard =
    | Omit<BasicCard, 'id' | 'deckId'>
    | Omit<InputCard, 'id' | 'deckId'>
    | Omit<SequencingCard, 'id' | 'deckId'>;
}

// =================================================================
// --- UI & Interaction Namespaces ---
// =================================================================

/** Types related to the command palette and global search functionality. */
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
  }

  /** Configuration for the media (image or YouTube) editing modal. */
  export interface MediaConfig {
    type: 'media';
    nodeType: 'image' | 'youtube';
    nodePos: number;
    attrs: Record<string, any>;
  }

  /** A discriminated union of all possible modal configurations. */
  export type Config = FormulaConfig | MediaConfig;
}

// =================================================================
// --- Feature-Specific Namespaces ---
// =================================================================

/** Types related to the Text-to-Speech (TTS) feature. */
export namespace TTS {
  /** A parsed block of text from the editor, ready for TTS playback. */
  export interface ReadableNode {
    id: number;
    pos: number;
    node: ProseMirrorNode;
    title: string;
    text: string;
  }

  /** The structure of a voice available in a TTS engine. */
  export interface Voice {
    id: string;
    name: string;
    lang: string;
  }

  /** The possible operational statuses of the TTS player. */
  export type Status =
    | 'idle'
    | 'initializing'
    | 'awaiting_download'
    | 'playing'
    | 'paused'
    | 'error';
}

/** Types related to tree visualizations (e.g., D3.js). */
export namespace Viz {
  /** Defines the hierarchical data structure for tree visualizations. */
  export interface TreeNode {
    id: string;
    content: string;
    children?: TreeNode[];
  }
}
