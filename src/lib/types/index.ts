// src/lib/types/index.ts

/**
 * This file centralizes all custom type and interface definitions
 * for the application, providing a single source of
 * truth for data structures.
 */

// --- Core Data Structures ---

/**
 * Represents the user's unique cryptographic identity, generated and
 * stored locally in their browser.
 */
export interface Identity {
  publicKey: string;
  privateKey: string;
}

/**
 * Represents the metadata of a schema (document) in the user's directory.
 */
export interface SchemaMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  type: 'schema' | 'folder';
  parentId: string | null;
}

/**
 * Represents the complete structure of a user's vault for export/import.
 */
export interface Vault {
  schemas: SchemaMetadata[];
  content: Record<string, string>;
}

// --- Card and Review System Types ---

/**
 * The quality of the user's response for a card review.
 * Follows the SM-2 algorithm scale where:
 * 0: "Again" - Complete failure to recall.
 * 3: "Good" - Correct response recalled with some hesitation.
 * 5: "Easy" - Correct response recalled with perfect ease.
 * We use a simplified 0, 3, 5 scale for the UI.
 */
export type ReviewQuality = 0 | 3 | 5;

/**
 * The data structure for the Spaced Repetition System (SRS) algorithm.
 * Attached to every card.
 */
export interface SrsData {
  easeFactor: number;
  interval: number; // in days
  repetitions: number;
  dueDate: number; // timestamp
}

/**
 * The union of all possible card types, used for type discrimination.
 */
export type CardType = 'basic' | 'input' | 'sequencing'; // 'audio' removed for now

// --- Individual Card Type Definitions ---

interface CardBase {
  id: string;
  nodeId: string;
  srs: SrsData;
}

export interface BasicCard extends CardBase {
  type: 'basic';
  content: {
    question: string;
    answer: string;
  };
}

export interface InputCard extends CardBase {
  type: 'input';
  content: {
    prompt: string;
    expected: string;
  };
}

export interface SequencingCard extends CardBase {
  type: 'sequencing';
  content: {
    prompt: string;
    items: string[];
  };
}

/**
 * A discriminated union of all possible card types.
 * The `type` property is the discriminant.
 */
export type Card = BasicCard | InputCard | SequencingCard;

// --- Tree Visualization Types ---

/**
 * Defines the hierarchical data structure used for the D3 tree visualization.
 */
export interface TreeNodeData {
  id: string;
  content: string;
  children?: TreeNodeData[];
}
