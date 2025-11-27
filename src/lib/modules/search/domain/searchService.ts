/**
 * @file searchService.ts
 * @module search
 * @description
 * The central search orchestration service for the application.
 *
 * This service coordinates:
 * - Semantic content search (via Neural Index).
 * - Command search (via Command Bar logic).
 * - Result aggregation and formatting.
 * - Path generation for breadcrumbs.
 */

import {
  neuralIndexService,
  type ScoredChunk,
} from '$lib/modules/ai/neuralIndexService';
import { fileSystemStore } from '$lib/modules/file-system/stores/fileSystemStore.svelte';
import type { SchemaMetadata } from '$lib/types';
import { searchCommands, type SearchOptions } from '@modules/command-bar';
import type { Search } from '$lib/types';
import * as errorService from '$lib/core/services/errorService';

// --- Internal Helpers ---

/**
 * Creates a short, contextual snippet of text centered around the best match for the query.
 * This improves the relevance of search results displayed to the user.
 *
 * @param fullText - The complete text content to snippet.
 * @param query - The user's search string.
 * @param maxLength - The maximum character length of the returned snippet.
 * @returns {string} A truncated string with ellipses.
 */
function createCenteredSnippet(
  fullText: string,
  query: string,
  maxLength: number
): string {
  if (!fullText || !query)
    return fullText.length > maxLength
      ? fullText.substring(0, maxLength) + '...'
      : fullText;

  const queryWords = query.trim().toLowerCase().split(/\s+/);
  const lowerCaseText = fullText.toLowerCase();
  let firstMatchIndex = -1;

  // Find the first occurrence of any query word
  for (const word of queryWords) {
    const index = lowerCaseText.indexOf(word);
    if (index !== -1) {
      firstMatchIndex = index;
      break;
    }
  }

  if (firstMatchIndex === -1) {
    return fullText.length > maxLength
      ? fullText.substring(0, maxLength) + '...'
      : fullText;
  }

  // Calculate start index to center the match
  const idealStart = Math.max(0, firstMatchIndex - Math.floor(maxLength / 2));
  // Adjust start to the beginning of a word to avoid cutting words in half
  const start =
    idealStart === 0 ? 0 : fullText.lastIndexOf(' ', idealStart) + 1;

  let snippet = fullText.substring(start, start + maxLength);

  if (start > 0) snippet = '... ' + snippet;
  if (start + maxLength < fullText.length) snippet = snippet + ' ...';

  return snippet;
}

/**
 * Recursively reconstructs the breadcrumb path for a file system item.
 *
 * @param itemId - The ID of the item.
 * @param docMap - A lookup map of all documents/folders.
 * @returns {string} A slash-separated path string (e.g., "Physics / Mechanics").
 */
function getItemPath(
  itemId: string,
  docMap: Map<string, SchemaMetadata>
): string {
  const pathParts: string[] = [];
  let currentItem = docMap.get(itemId);

  // Traverse up the parent chain
  while (currentItem?.parentId) {
    const parent = docMap.get(currentItem.parentId);
    if (parent) {
      pathParts.unshift(parent.title);
      currentItem = parent;
    } else {
      break;
    }
  }
  return pathParts.join(' / ');
}

/**
 * Executes the semantic search against the Neural Index.
 *
 * @param queryText - The search query.
 * @param docMap - The map of all documents for title/path resolution.
 * @returns {Promise<Search.ContentResult[]>} List of content matches.
 */
async function findContent(
  queryText: string,
  docMap: Map<string, SchemaMetadata>
): Promise<Search.ContentResult[]> {
  const chunksResult = await neuralIndexService.findSimilarChunksAcrossVault(
    queryText,
    10
  );

  if (!chunksResult.ok) {
    errorService.reportError(chunksResult.error, {
      context: 'SearchService',
      action: 'findContent',
      metadata: { query: queryText },
    });
    return [];
  }

  const topChunks = chunksResult.value;

  const results: (Search.ContentResult | null)[] = topChunks.map(
    (chunk: ScoredChunk) => {
      const doc = docMap.get(chunk.docId);
      if (!doc) return null;

      // Format the content for display
      // Assuming chunk content is stored as "Term\nDescription: ..."
      const snippetParts = chunk.content.split('\nDescription: ');
      const term = snippetParts[0];
      const description = snippetParts[1] || '';
      const centeredDescription = createCenteredSnippet(
        description,
        queryText,
        150
      );
      const finalSnippet = `${term}\nDescription: ${centeredDescription}`;

      return {
        docId: chunk.docId,
        title: doc.title,
        snippet: finalSnippet,
        score: chunk.similarity,
        path: getItemPath(chunk.docId, docMap) || undefined,
        nodeId: chunk.nodeId,
      };
    }
  );

  return results.filter((r): r is Search.ContentResult => r !== null);
}

// =================================================================
// --- PUBLIC API ---
// =================================================================

/**
 * Performs a federated search across Command and Knowledge domains.
 *
 * @param queryText - The raw search string from the user.
 * @param commandOptions - Configuration for the command search (e.g., callbacks).
 * @returns {Promise<Search.ResultGroup[]>} Grouped results ready for the UI.
 */
export async function performSearch(
  queryText: string,
  commandOptions: SearchOptions
): Promise<Search.ResultGroup[]> {
  const trimmedQuery = queryText.trim();
  const resultGroups: Search.ResultGroup[] = [];

  // Hydrate the doc map for efficient lookups
  const allDocs = fileSystemStore.getAll();
  const docMap = new Map<string, SchemaMetadata>(
    allDocs.map((doc) => [doc.id, doc])
  );

  // Run searches in parallel
  const [contentResults, commandResults] = await Promise.all([
    // Only run expensive content search if query is long enough
    trimmedQuery.length > 2
      ? findContent(trimmedQuery, docMap)
      : Promise.resolve([]),
    searchCommands(trimmedQuery, commandOptions),
  ]);

  // Aggregate results
  if (commandResults.length > 0) {
    resultGroups.push({ type: 'Commands', items: commandResults });
  }
  if (contentResults.length > 0) {
    resultGroups.push({ type: 'Knowledge', items: contentResults });
  }

  return resultGroups;
}
