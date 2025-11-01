/**
 * @file Centralizes all custom type and interface definitions for the application.
 * @module types
 */

// --- UI & Component Types ---
import type { IconName } from './iconName'; // <<< IMPORT ADDED HERE
import type { Node as ProseMirrorNode } from 'prosemirror-model';

// --- Core Data Structures ---

/**
 * Represents the user's unique cryptographic identity.
 */
export interface Identity {
  /** The public part of the cryptographic key pair. */
  publicKey: string;
  /** The private part of the cryptographic key pair. */
  privateKey: string;
}

/**
 * Represents the metadata of a schema or a folder.
 */
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

/**
 * Represents the complete structure of a user's vault, used for import and export.
 */
export interface Vault {
  /** An array of all schema and folder metadata objects. */
  schemas: SchemaMetadata[];
  /** A key-value map where the key is the schema ID and the value is the Y.js document content. */
  content: Record<string, string>;
}

// --- Card and Spaced Repetition System (SRS) Types ---

/**
 * Represents the quality of the user's response during a card review session.
 * 0: Again, 3: Hard, 4: Good, 5: Easy.
 */
export type ReviewQuality = 0 | 3 | 4 | 5;

/**
 * The core data structure for the Spaced Repetition System (SRS) algorithm.
 */
export interface SrsData {
  /** The ease factor, which determines how much the interval increases after a correct review. */
  easeFactor: number;
  /** The current interval (in days) until the next scheduled review. */
  interval: number;
  /** The total number of times the card has been successfully reviewed. */
  repetitions: number;
  /** The timestamp when the card is next due for review. */
  dueDate: number;
  /** Index of the current learning step (e.g., 0 for '1m', 1 for '10m'). 0 means graduated. */
  learningStep: number;
}

/**
 * A union of all possible card types.
 */
export type CardType = 'basic' | 'input' | 'sequencing'; // Add 'cloze' here later

// --- Individual Card Type Definitions ---

/** The base interface shared by all card types. */
interface CardBase {
  /** The unique identifier for the card itself. */
  id: string;
  /** The ID of the document (deck) this card belongs to. */
  deckId: string;
  /** The SRS data object that tracks the learning state of this card. */
  srs: SrsData;
  /** An array of tags for organization. */
  tags: string[];
  /** Whether the card is suspended from review. */
  suspended: boolean;
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
 */
export type Card = BasicCard | InputCard | SequencingCard;

// --- Tree Visualization Types ---

/**
 * Defines the hierarchical data structure required by the D3.js tree visualization component.
 */
export interface TreeNodeData {
  id: string;
  content: string;
  children?: TreeNodeData[];
}

// --- Card Creation Types ---

/**
 * Represents the shape of a new card (before it is stored in the database).
 */
export type NewBasicCard = Omit<BasicCard, 'id' | 'deckId'>;
export type NewInputCard = Omit<InputCard, 'id' | 'deckId'>;
export type NewSequencingCard = Omit<SequencingCard, 'id' | 'deckId'>;

export type NewCard = NewBasicCard | NewInputCard | NewSequencingCard;

// --- Command Palette Types ---

// <<< The IconName type definition was removed from here >>>

export interface Command {
  /** Unique identifier for the command. */
  id: string;
  /** Localized label to show in the UI. */
  label: string;
  /** Icon name from the Icon component library. */
  icon: IconName;
  /**
   * The action to run when the command is executed.
   * It can optionally receive a MouseEvent, which is useful for
   * detecting modifier keys like Shift.
   */
  action: (event?: MouseEvent) => void;
  /** Whether the command should be enabled in the current context. Optional. */
  isEnabled?: () => boolean;
  /** Additional search keywords to help fuzzy matching. Optional. */
  keywords?: string[];
}

// --- TTS (Text-to-Speech) Types ---

/**
 * Describes a parsed block of text from the editor, ready for TTS.
 */
export interface ReadableNode {
  /** The unique ID for this node, typically its index in the playlist array. */
  id: number;
  /** The starting position of the node in the ProseMirror document. */
  pos: number;
  /** The raw ProseMirror node instance. */
  node: ProseMirrorNode;
  /** A short, display-friendly title for the node (used in the UI). */
  title: string;
  /** The full, cleaned text content that will be sent to the TTS engine. */
  text: string;
  /** DEPRECATED: Use 'text' instead. This is kept for compatibility during refactor. */
  textToSpeak?: string;
}

/**
 * Describes the structure of a voice available in a TTS engine.
 */
export interface TTSVoice {
  id: string;
  name: string;
  lang: string;
}

/**
 * The possible TTS engines the application can use.
 */
export type TTSEngine = 'cloud' | 'browser';

/**
 * The possible operational statuses of the TTS player.
 */
export type TTSStatus =
  | 'idle'
  | 'initializing'
  | 'awaiting_download'
  | 'playing'
  | 'paused'
  | 'error';
