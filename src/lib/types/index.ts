/**
 * @file Centralizes all custom type and interface definitions for the application.
 * @module types
 */

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
 * 0: "Again", 3: "Good", 5: "Easy".
 */
export type ReviewQuality = 0 | 3 | 5;

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
}

/**
 * A union of all possible card types.
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
