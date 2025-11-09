/**
 * @file searchService.ts
 * @service
 * @description Orchestrates command and content search across the entire application vault.
 */

import * as neuralIndexService from '$lib/services/ai/neuralIndexService';
import * as directoryService from '$lib/services/core/directoryService';
import type { SchemaMetadata } from '$lib/types';
import { searchCommands, type SearchOptions } from './commandService';
// REFINEMENT: Import the Search namespace for all search-related types.
import type { Search } from '$lib/types';

// --- HELPER FUNCTIONS (INTERNAL) ---

/**
 * Creates an ellipsed snippet of text centered around the first matching query word.
 * @param fullText The complete text of the description.
 * @param query The user's search query.
 * @param maxLength The desired maximum length of the snippet.
 * @returns A smaller, context-rich snippet.
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

  const idealStart = Math.max(0, firstMatchIndex - Math.floor(maxLength / 2));
  const start =
    idealStart === 0 ? 0 : fullText.lastIndexOf(' ', idealStart) + 1;

  let snippet = fullText.substring(start, start + maxLength);

  if (start > 0) snippet = '... ' + snippet;
  if (start + maxLength < fullText.length) snippet = snippet + ' ...';

  return snippet;
}

/**
 * Recursively finds the full path of an item in the directory hierarchy.
 * @param itemId The ID of the item to find the path for.
 * @param docMap A map of all documents for efficient lookups.
 * @returns A breadcrumb-style path string.
 */
function getItemPath(
  itemId: string,
  docMap: Map<string, SchemaMetadata>
): string {
  const pathParts: string[] = [];
  let currentItem = docMap.get(itemId);
  // Traverse up the parent chain until there's no parent or the parent can't be found.
  while (currentItem?.parentId) {
    const parent = docMap.get(currentItem.parentId);
    if (parent) {
      pathParts.unshift(parent.title);
      currentItem = parent; // Move up the tree
    } else {
      break; // Parent not found, stop traversing
    }
  }
  return pathParts.join(' / ');
}

/**
 * Performs a semantic search for content chunks across the vault.
 * @param queryText The user's search query.
 * @param docMap A map of all documents.
 * @returns An array of formatted content search results.
 */
// REFINEMENT: Use the namespaced Search.ContentResult type.
async function findContent(
  queryText: string,
  docMap: Map<string, SchemaMetadata>
): Promise<Search.ContentResult[]> {
  const topChunks = await neuralIndexService.findSimilarChunksAcrossVault(
    queryText,
    10
  );

  const results: (Search.ContentResult | null)[] = topChunks.map((chunk) => {
    const doc = docMap.get(chunk.docId);
    if (!doc) return null;

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
  });

  return results.filter((r): r is Search.ContentResult => r !== null);
}

// =================================================================
// --- PUBLIC API ---
// =================================================================

/**
 * Performs a comprehensive search for both content and commands.
 * @param queryText The user's search query.
 * @param commandOptions Options required for command search functionality.
 * @returns A promise that resolves to an array of grouped search results.
 */
// REFINEMENT: Use the namespaced Search.ResultGroup type.
export async function performSearch(
  queryText: string,
  commandOptions: SearchOptions
): Promise<Search.ResultGroup[]> {
  const trimmedQuery = queryText.trim();
  const resultGroups: Search.ResultGroup[] = [];
  const allDocs = await directoryService.getAllItems();
  const docMap = new Map<string, SchemaMetadata>(
    allDocs.map((doc) => [doc.id, doc])
  );

  // Run content and command searches in parallel for performance.
  const [contentResults, commandResults] = await Promise.all([
    trimmedQuery.length > 2
      ? findContent(trimmedQuery, docMap)
      : Promise.resolve([]),
    searchCommands(trimmedQuery, commandOptions),
  ]);

  // Add groups to the final results only if they contain items.
  if (commandResults.length > 0) {
    resultGroups.push({ type: 'Commands', items: commandResults });
  }
  if (contentResults.length > 0) {
    resultGroups.push({ type: 'Knowledge', items: contentResults });
  }

  return resultGroups;
}
