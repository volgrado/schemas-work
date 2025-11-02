/**
 * @file Manages the Neural Index, adapted to replicate the original "Term/Description" logic
 * for a heading-based document structure.
 * @module neuralIndexService
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
export interface ScoredChunk {
  content: string;
  docId: string;
  similarity: number;
  nodeId: string;
}

// --- Database Schema (Unchanged) ---
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
      chunks: null,
    });
  }
}
const db = new NeuralIndexDB();

// --- THE DEFINITIVE FIX: Re-implementing your original Term/Description logic ---
function atomizeDocument(
  docId: string,
  doc: ProseMirrorNode
): { id: string; content: string }[] {
  const chunks: { id: string; content: string }[] = [];
  const nodes = doc.toJSON().content || [];

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
        // Robustly get text content, even with formatting
        const term = (node.content || [])
          .map((c: { text?: string }) => c.text || '')
          .join('');

        const description = (nextNode.content || [])
          .map((c: { text?: string }) => c.text || '')
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

const debouncedIndexDocument = debounce(
  async (docId: string, doc: ProseMirrorNode) => {
    try {
      const { embeddingMethod } = get(settingsStore);
      const activeTable =
        embeddingMethod === 'local' ? db.local_chunks : db.cloud_chunks;
      const contentChunks = atomizeDocument(docId, doc);
      const existingChunks = await activeTable
        .where('docId')
        .equals(docId)
        .toArray();
      const newChunkIds = new Set(contentChunks.map((c) => c.id));
      const chunksToDelete = existingChunks.filter(
        (c: KnowledgeChunk) => !newChunkIds.has(c.id)
      );
      if (chunksToDelete.length > 0) {
        await activeTable.bulkDelete(
          chunksToDelete.map((c: KnowledgeChunk) => c.id)
        );
      }
      const existingChunkMap = new Map<string, string>(
        existingChunks.map((chunk) => [chunk.id, chunk.content])
      );
      const chunksToIndex = contentChunks.filter(
        (newChunk) =>
          !existingChunkMap.has(newChunk.id) ||
          existingChunkMap.get(newChunk.id) !== newChunk.content
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

export function indexDocument(docId: string, doc: ProseMirrorNode) {
  debouncedIndexDocument(docId, doc);
}

export async function findSimilarChunksAcrossVault(
  queryText: string,
  limit: number = 10
): Promise<ScoredChunk[]> {
  try {
    const { embeddingMethod } = get(settingsStore);
    const activeTable =
      embeddingMethod === 'local' ? db.local_chunks : db.cloud_chunks;
    const queryEmbedding = await getEmbedding(queryText);
    const allChunks = await activeTable.toArray();
    if (allChunks.length === 0) return [];
    let allScoredChunks: ScoredChunk[] = [];
    for (let i = 0; i < allChunks.length; i += 150) {
      const batch = allChunks.slice(i, i + 150);
      allScoredChunks.push(
        ...batch.map((chunk) => ({
          nodeId: chunk.id,
          content: chunk.content,
          docId: chunk.docId,
          similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
        }))
      );
    }
    allScoredChunks.sort((a, b) => b.similarity - a.similarity);
    return allScoredChunks.slice(0, limit);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'findSimilarChunksAcrossVault',
    });
    return [];
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}
