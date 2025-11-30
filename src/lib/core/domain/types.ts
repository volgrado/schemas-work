/**
 * @file types.ts
 * @module core
 * @description
 * Defines global domain types for the application.
 */

export type Provider = 'gemini' | 'local-gemma-3n' | 'local-webllm';

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
