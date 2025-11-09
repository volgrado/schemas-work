/**
 * @file Manages the Neural Index, adapted to replicate the "Term/Description" logic
 * for a heading-based document structure.
 * @module neuralIndexService
 */

import Dexie, { type Table } from 'dexie';
import * as errorService from '$lib/services/core/errorService';
import { getEmbedding } from '$lib/services/ai/embeddingStrategies';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { debounce } from '$lib/utils/debounce';
// REFINEMENT: Import the reactive `settingsState` object from the Rune-based store.
import { settingsState } from '$lib/stores/settingsStore.svelte';

// --- Type Definitions ---
export interface KnowledgeChunk {
  id: string; // Corresponds to the Tiptap node's `nodeId`
  docId: string;
  content: string; // "Term: ...\nDescription: ..."
  embedding: number[];
}
export interface IndexMetadata {
  key: 'cloud_lastUpdated' | 'local_lastUpdated' | 'active_index_type';
  value: any;
}
export interface ScoredChunk {
  content: string;
  docId: string;
  similarity: number;
  nodeId: string;
}

// --- Database Schema ---
class NeuralIndexDB extends Dexie {
  cloud_chunks!: Table<KnowledgeChunk, string>;
  local_chunks!: Table<KnowledgeChunk, string>;
  metadata!: Table<IndexMetadata, 'key'>;
  constructor() {
    super('NeuralIndexDatabase');
    this.version(2).stores({
      cloud_chunks: 'id, docId',
      local_chunks: 'id, docId',
      metadata: 'key',
      chunks: null, // Migration cleanup
    });
  }
}
const db = new NeuralIndexDB();

// --- Private Helper Functions ---

/**
 * Atomizes a Tiptap document into "Term/Description" chunks based on heading levels.
 * This is the core logic for preparing content for semantic indexing.
 */
function atomizeDocument(
  doc: ProseMirrorNode
): { id: string; content: string }[] {
  const chunks: { id: string; content: string }[] = [];
  const nodes = doc.content.toJSON();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (
      node.type === 'heading' &&
      node.attrs &&
      (node.attrs.level === 2 || node.attrs.level === 3) &&
      i + 1 < nodes.length
    ) {
      const nextNode = nodes[i + 1];
      if (
        nextNode.type === 'paragraph' &&
        (nextNode.content || []).length > 0
      ) {
        const term = (node.content || [])
          .map((c: any) => c.text || '')
          .join('');
        const description = (nextNode.content || [])
          .map((c: any) => c.text || '')
          .join('');
        const nodeId = node.attrs.nodeId;

        if (term.trim() && description.trim() && nodeId) {
          chunks.push({
            id: nodeId,
            content: `Term: ${term.trim()}\nDescription: ${description.trim()}`,
          });
        }
      }
    }
  }
  return chunks;
}

/**
 * Calculates the cosine similarity between two vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// =================================================================
// --- PUBLIC API ---
// =================================================================

/**
 * Debounced function to index a document's content.
 * This function handles atomization, embedding, and storage, while ensuring
 * that rapid changes do not overload the embedding API.
 */
const debouncedIndexDocument = debounce(
  async (docId: string, doc: ProseMirrorNode) => {
    try {
      // REFINEMENT: Read directly from the reactive `settingsState` signal. No `get()` needed.
      const { embeddingMethod } = settingsState;
      const activeTable =
        embeddingMethod === 'local' ? db.local_chunks : db.cloud_chunks;
      const contentChunks = atomizeDocument(doc);

      // Efficiently find chunks to update or delete.
      const existingChunks = await activeTable
        .where('docId')
        .equals(docId)
        .toArray();
      const newChunkIds = new Set(contentChunks.map((c) => c.id));
      const chunksToDelete = existingChunks.filter(
        (c) => !newChunkIds.has(c.id)
      );

      if (chunksToDelete.length > 0) {
        await activeTable.bulkDelete(chunksToDelete.map((c) => c.id));
      }

      const existingChunkMap = new Map<string, string>(
        existingChunks.map((chunk) => [chunk.id, chunk.content])
      );
      const chunksToIndex = contentChunks.filter(
        (newChunk) => existingChunkMap.get(newChunk.id) !== newChunk.content
      );

      if (chunksToIndex.length === 0) return;

      const embeddingPromises = chunksToIndex.map(async (chunk) => ({
        ...chunk,
        docId,
        embedding: await getEmbedding(chunk.content),
      }));
      const knowledgeChunks = await Promise.all(embeddingPromises);
      await activeTable.bulkPut(knowledgeChunks);
    } catch (error) {
      errorService.reportError(error, {
        operation: 'debouncedIndexDocument',
        docId,
      });
    }
  },
  2500
);

/**
 * Public entry point to trigger the debounced indexing process for a document.
 * @param docId The ID of the document.
 * @param doc The Tiptap document node.
 */
export function indexDocument(docId: string, doc: ProseMirrorNode) {
  debouncedIndexDocument(docId, doc);
}

/**
 * Performs a semantic similarity search across all indexed chunks in the vault.
 * @param queryText The user's search query.
 * @param limit The maximum number of results to return.
 * @returns An array of the top matching chunks, sorted by similarity score.
 */
export async function findSimilarChunksAcrossVault(
  queryText: string,
  limit: number = 10
): Promise<ScoredChunk[]> {
  try {
    // REFINEMENT: Read directly from the reactive `settingsState` signal.
    const { embeddingMethod } = settingsState;
    const activeTable =
      embeddingMethod === 'local' ? db.local_chunks : db.cloud_chunks;
    const queryEmbedding = await getEmbedding(queryText);
    const allChunks = await activeTable.toArray();

    if (allChunks.length === 0) return [];

    const allScoredChunks: ScoredChunk[] = allChunks.map((chunk) => ({
      nodeId: chunk.id,
      content: chunk.content,
      docId: chunk.docId,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    allScoredChunks.sort((a, b) => b.similarity - a.similarity);
    return allScoredChunks.slice(0, limit);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'findSimilarChunksAcrossVault',
    });
    return [];
  }
}
