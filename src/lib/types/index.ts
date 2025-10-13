// src/lib/types/index.ts

/**
 * This file centralizes all custom type and interface definitions
 * for the application, providing a single source of
 * truth for data structures.
 */

/**
 * Represents the user's unique cryptographic identity, generated and
 * stored locally in their browser. It is used for future
 * signing and collaboration functionalities.
 */
export interface Identity {
  /** The public key in stringified JSON Web Key (JWK) format. */
  publicKey: string;
  /** The private key in stringified JSON Web Key (JWK) format. */
  privateKey: string;
}

/**
 * Represents the metadata of a schema (document) in the user's directory.
 * It does not contain the document's content, only the information for listing and managing it.
 */
export interface SchemaMetadata {
  /** Universal unique identifier (UUID v4) of the document. */
  id: string;
  /** Title of the schema, editable by the user. */
  title: string;
  /** Timestamp (in milliseconds) of the schema's creation. */
  createdAt: number;
  /** Timestamp (in milliseconds) of the last modification. */
  updatedAt: number;
  /** Distinguishes between a document and a container. */
  type: 'schema' | 'folder';
  /** The ID of the parent. If `null`, it is at the root. */
  parentId: string | null;
}

/**
 * Represents the complete structure of a user's vault.
 * This is the object that is encrypted and exported/imported.
 */
export interface Vault {
  /** The list of all schema metadata. */
  schemas: SchemaMetadata[];
  /**
   * A dictionary that maps a schema's ID to its full content.
   * The content is stored as a Base64 encoded Y.js "update",
   * which allows capturing the entire state of the document efficiently.
   */
  content: Record<string, string>;
}

/**
 * Represents a single study card (question and answer)
 * associated with a schema node, with data for spaced repetition.
 */
export interface DomainCard {
  /** The text of the question. */
  q: string;
  /** The text of the answer. */
  a: string;

  /** Ease Factor. Starts at 2.5. A lower number means the card is more difficult. */
  easeFactor?: number;
  /** The interval in days until the next review. */
  interval?: number;
  /** The number of times the card has been correctly reviewed. */
  repetitions?: number;
  /** The date (in millisecond timestamp format) when this card should be reviewed. */
  dueDate?: number;
}

/**
 * Represents a single node in the hierarchical structure returned by the AI.
 * It is a recursive structure.
 */
export interface AISchemaNode {
  content: string;
  children?: AISchemaNode[];
}

/**
 * The complete structure of the JSON object that we expect the AI to return
 * when processing unstructured text.
 */
export interface AISchemaResponse {
  title: string;
  nodes: AISchemaNode[];
}
