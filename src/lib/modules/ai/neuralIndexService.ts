/**
 * @file Manages the Neural Index, adapted to replicate the "Term/Description" logic
 * for a heading-based document structure.
 * @module neuralIndexService
 */

import Dexie, { type Table } from 'dexie';
import * as errorService from '$lib/core/services/errorService';
import { getEmbedding } from '$lib/modules/ai/embeddingStrategies';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { debounce } from '$lib/core/utils/debounce';
import { settingsState } from '$lib/modules/settings/ui/settingsStore.svelte';
import { type Result, ok, err } from '$lib/core/domain/result';

// --- Type Definitions ---
export interface KnowledgeChunk {
  id: string; // Corresponds to the Tiptap node's `nodeId`
  docId: string;
  content: string; // "Term: ...\nDescription: ..."
  embedding: number[];
}
export interface IndexMetadata {
  key: 'cloud_lastUpdated' | 'local_lastUpdated' | 'active_index_type';
  value: unknown;
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
  chunks!: Table<unknown, unknown>; // For migration/cleanup if needed

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

// --- Worker Initialization ---
let worker: Worker | null = null;

if (typeof Worker !== 'undefined') {
  // Initialize the worker
  worker = new Worker(new URL('../../workers/neuralIndex.worker.ts', import.meta.url), {
    type: 'module',
  });
}

// --- Private Helper Functions ---

/**
 * Wraps the worker communication in a promise.
 */
function atomizeDocumentInWorker(
  docId: string,
  docJson: Record<string, unknown>
): Promise<{ id: string; content: string }[]> {
  return new Promise((resolve) => {
    if (!worker) {
      console.warn('Neural Index Worker not available.');
      resolve([]);
      return;
    }

    const handleMessage = (e: MessageEvent) => {
      const { type, docId: responseDocId, chunks } = e.data;
      if (type === 'atomized' && responseDocId === docId) {
        worker?.removeEventListener('message', handleMessage);
        resolve(chunks);
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ type: 'atomize', docId, docJson });
  });
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
 * This function handles atomization (via worker), embedding, and storage.
 */
const debouncedIndexDocument = debounce(
  async (docId: string, doc: ProseMirrorNode) => {
    try {
      const { embeddingMethod } = settingsState;
      const activeTable =
        embeddingMethod === 'local' ? db.local_chunks : db.cloud_chunks;
      
      // Offload atomization to worker
      const contentChunks = await atomizeDocumentInWorker(docId, doc.toJSON());

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
export async function indexDocument(docId: string, doc: ProseMirrorNode): Promise<Result<void>> {
  try {
    debouncedIndexDocument(docId, doc);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
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
): Promise<Result<ScoredChunk[]>> {
  try {
    const { embeddingMethod } = settingsState;
    const activeTable =
      embeddingMethod === 'local' ? db.local_chunks : db.cloud_chunks;
    const queryEmbedding = await getEmbedding(queryText);
    const allChunks = await activeTable.toArray();

    if (allChunks.length === 0) return ok([]);

    const allScoredChunks: ScoredChunk[] = allChunks.map((chunk) => ({
      nodeId: chunk.id,
      content: chunk.content,
      docId: chunk.docId,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    allScoredChunks.sort((a, b) => b.similarity - a.similarity);
    return ok(allScoredChunks.slice(0, limit));
  } catch (error) {
    errorService.reportError(error, {
      operation: 'findSimilarChunksAcrossVault',
    });
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export const neuralIndexService = {
  indexDocument,
  findSimilarChunksAcrossVault,
};
