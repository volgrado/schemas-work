/**
 * @file Manages the Neural Index, a local "second brain" for the user's content.
 * @module neuralIndexService
 *
 * @remarks
 * This service implements the "Active Index" strategy, maintaining separate, parallel
 * indexes for cloud-based and local embeddings to support a hybrid methodology.
 *
 * It is responsible for:
 * 1.  Atomizing documents into knowledge chunks.
 * 2.  Indexing chunks into the currently active table (`cloud_chunks` or `local_chunks`).
 * 3.  Providing a non-blocking, cooperative search function (`findSimilarChunksAcrossVault`)
 *     that queries the active index without freezing the UI.
 */

import Dexie, { type Table } from 'dexie';
import * as errorService from '$lib/services/core/errorService';
import { getEmbedding } from '$lib/services/ai/embeddingStrategies';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { debounce } from '$lib/utils/debounce';
import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';

// --- Type Definitions ---

export interface KnowledgeChunk {
  id: string;
  docId: string;
  content: string;
  embedding: number[];
}

export interface IndexMetadata {
  key: 'cloud_lastUpdated' | 'local_lastUpdated' | 'active_index_type';
  value: any;
}

// --- NEW INTERFACE ---
// Defines the shape of the object returned by the search function.
export interface ScoredChunk {
  content: string;
  docId: string;
  similarity: number;
}

// --- Database Schema ---

class NeuralIndexDB extends Dexie {
  cloud_chunks!: Table<KnowledgeChunk>;
  local_chunks!: Table<KnowledgeChunk>;
  metadata!: Table<IndexMetadata, 'key'>;

  constructor() {
    super('NeuralIndexDatabase');
    // Migration from v1 (single `chunks` table) to v2 (dual tables + metadata)
    this.version(2).stores({
      cloud_chunks: 'id, docId',
      local_chunks: 'id, docId',
      metadata: 'key',
      chunks: null, // Deletes the old, obsolete table from v1
    });
  }
}

const db = new NeuralIndexDB();

// --- Core Functions ---

function atomizeDocument(
  docId: string,
  doc: ProseMirrorNode
): { id: string; content: string }[] {
  const chunks: { id: string; content: string }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'listItem') {
      let term = '',
        description = '';
      node.forEach((childNode) => {
        if (childNode.type.name === 'paragraph') {
          if (childNode.attrs.role === 'term') term = childNode.textContent;
          else if (childNode.attrs.role === 'description')
            description = childNode.textContent;
        }
      });
      if (term.trim() && description.trim()) {
        chunks.push({
          id: `${docId}-${pos}`,
          content: `Term: ${term}\nDescription: ${description}`,
        });
      } else if (term.trim()) {
        chunks.push({ id: `${docId}-${pos}`, content: term });
      }
    }
  });
  return chunks;
}

const debouncedIndexDocument = debounce(
  async (docId: string, doc: ProseMirrorNode) => {
    try {
      // Determine which index is currently active based on user settings.
      const { embeddingMethod } = get(settingsStore); // Assumes 'cloud' or 'local'
      const activeTable =
        embeddingMethod === 'local' ? db.local_chunks : db.cloud_chunks;
      const activeMetaKey =
        embeddingMethod === 'local' ? 'local_lastUpdated' : 'cloud_lastUpdated';

      const contentChunks = atomizeDocument(docId, doc);
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
        console.log(
          `[Neural Index] Cleaned up ${chunksToDelete.length} stale chunks from '${activeTable.name}'.`
        );
      }

      const chunksToIndex = contentChunks.filter((newChunk) => {
        const existing = existingChunks.find((c) => c.id === newChunk.id);
        return !existing || existing.content !== newChunk.content;
      });

      if (chunksToIndex.length === 0) return;

      console.log(
        `[Neural Index] Found ${chunksToIndex.length} new/updated chunks to index in '${activeTable.name}'.`
      );

      const embeddingPromises = chunksToIndex.map(async (chunk) => {
        const embedding = await getEmbedding(chunk.content);
        return { ...chunk, docId, embedding };
      });

      const knowledgeChunks = await Promise.all(embeddingPromises);
      await activeTable.bulkPut(knowledgeChunks);

      // After indexing, tag this table with a timestamp.
      await db.metadata.put({ key: activeMetaKey, value: Date.now() });

      console.log(
        `[Neural Index] Successfully indexed ${knowledgeChunks.length} chunks in '${activeTable.name}'.`
      );
    } catch (error) {
      errorService.reportError(error, {
        operation: 'debouncedIndexDocument',
        docId,
      });
    }
  },
  2500
);

export function indexDocument(docId: string, doc: ProseMirrorNode) {
  debouncedIndexDocument(docId, doc);
}

// --- Vault-wide Cooperative Search Function ---
function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function findSimilarChunksAcrossVault(
  queryText: string,
  limit: number = 10
): Promise<ScoredChunk[]> {
  // --- MODIFICATION #1: Update the return type signature
  try {
    const { embeddingMethod } = get(settingsStore);
    const activeTable =
      embeddingMethod === 'local' ? db.local_chunks : db.cloud_chunks;

    const queryEmbedding = await getEmbedding(queryText);
    const allChunks = await activeTable.toArray();
    if (allChunks.length === 0) return [];

    const BATCH_SIZE = 150;
    let allScoredChunks: ScoredChunk[] = [];

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const scoredBatch = batch.map((chunk) => ({
        content: chunk.content,
        docId: chunk.docId,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      }));
      allScoredChunks.push(...scoredBatch);
      await yieldToBrowser();
    }

    allScoredChunks.sort((a, b) => b.similarity - a.similarity);

    // --- MODIFICATION #2: Return the full scored chunk object, not a simplified one.
    // This ensures the `similarity` property is passed to the searchService.
    return allScoredChunks.slice(0, limit);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'findSimilarChunksAcrossVault',
    });
    return [];
  }
}

// --- Helper Functions ---
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}
