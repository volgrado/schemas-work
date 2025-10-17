/**
 * @file This file centralizes all custom type and interface definitions for the application,
 * providing a single, canonical source of truth for the shape of data structures used
 * throughout the codebase. Consolidating types here makes them easier to find, manage,
 * and import into various components and services.
 */

// --- Core Data Structures ---

/**
 * Represents the user's unique cryptographic identity, which is generated upon first use
 * and stored locally in their browser. This identity is fundamental for any future
 * encryption or authentication features.
 */
export interface Identity {
  /** The public part of the cryptographic key pair, safe to share. */
  publicKey: string;
  /** The private part of the cryptographic key pair, which must be kept secret. */
  privateKey: string;
}

/**
 * Represents the metadata of a schema (document) or a folder within the user's directory structure.
 * This object contains all information about an item except for its actual content.
 */
export interface SchemaMetadata {
  /** The unique identifier (UUID) for the item. */
  id: string;
  /** The user-defined title of the schema or folder. */
  title: string;
  /** The timestamp (in milliseconds since the Unix epoch) when the item was created. */
  createdAt: number;
  /** The timestamp (in milliseconds since the Unix epoch) when the item was last modified. */
  updatedAt: number;
  /** The type of the item, used to distinguish between documents and containers. */
  type: 'schema' | 'folder';
  /** The ID of the parent folder. `null` if the item is at the root level. */
  parentId: string | null;
}

/**
 * Represents the complete, self-contained structure of a user's vault, primarily used for
 * the import and export functionality. This allows users to back up and restore their entire workspace.
 */
export interface Vault {
  /** An array of all schema and folder metadata objects that define the directory structure. */
  schemas: SchemaMetadata[];
  /** A key-value map where the key is the schema ID and the value is the full Y.js document content, encoded as a string. */
  content: Record<string, string>;
}

// --- Card and Spaced Repetition System (SRS) Types ---

/**
 * Represents the quality of the user's response during a card review session.
 * This value directly influences the next review interval in the SM-2 algorithm.
 * 0: "Again" - Complete failure to recall the answer.
 * 3: "Good" - Correctly recalled the answer, but with some hesitation.
 * 5: "Easy" - Correctly and effortlessly recalled the answer.
 * A simplified 0-3-5 scale is used in the UI for clarity.
 */
export type ReviewQuality = 0 | 3 | 5;

/**
 * The core data structure for the Spaced Repetition System (SRS) algorithm,
 * attached to every flashcard to track its learning state.
 */
export interface SrsData {
  /** The ease factor, which determines how much the interval increases after a correct review. */
  easeFactor: number;
  /** The current interval (in days) until the next scheduled review. */
  interval: number;
  /** The total number of times the card has been successfully reviewed. */
  repetitions: number;
  /** The timestamp (in milliseconds since the Unix epoch) when the card is next due for review. */
  dueDate: number;
}

/**
 * A union of all possible card types, used for type discrimination in components and services.
 */
export type CardType = 'basic' | 'input' | 'sequencing';

// --- Individual Card Type Definitions ---

/** The base interface shared by all card types. */
interface CardBase {
  /** The unique identifier for the card itself. */
  id: string;
  /** The ID of the ProseMirror node from which this card was generated. */
  nodeId: string;
  /** The SRS data object that tracks the learning state of this card. */
  srs: SrsData;
}

/** A simple question-and-answer card. */
export interface BasicCard extends CardBase {
  type: 'basic';
  content: {
    question: string;
    answer: string;
  };
}

/** A card that prompts the user to type in the expected answer. */
export interface InputCard extends CardBase {
  type: 'input';
  content: {
    prompt: string;
    expected: string;
  };
}

/** A card that requires the user to order a list of items correctly. */
export interface SequencingCard extends CardBase {
  type: 'sequencing';
  content: {
    prompt: string;
    items: string[];
  };
}

/**
 * A discriminated union representing any possible card type.
 * The `type` property serves as the discriminant, allowing for type-safe switching.
 */
export type Card = BasicCard | InputCard | SequencingCard;

// --- Tree Visualization Types ---

/**
 * Defines the hierarchical data structure required by the D3.js tree visualization component.
 * Each node in the tree represents a ProseMirror node from the document.
 */
export interface TreeNodeData {
  id: string;
  content: string;
  children?: TreeNodeData[];
}
