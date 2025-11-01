import * as neuralIndexService from '$lib/services/ai/neuralIndexService';
import * as directoryService from '$lib/services/core/directoryService';
import type { SchemaMetadata } from '$lib/types';
import { searchCommands, type SearchOptions } from './commandService';
import type { SearchResultGroup } from '$lib/types/command';

// This interface represents only a CONTENT result
export interface SearchResult {
  docId: string;
  title: string;
  snippet: string;
  score: number;
  path?: string;
}

// Internal helper for semantic search
async function findContent(
  queryText: string,
  docMap: Map<string, SchemaMetadata>
): Promise<SearchResult[]> {
  const topChunks = await neuralIndexService.findSimilarChunksAcrossVault(
    queryText,
    10
  );
  return topChunks.reduce<SearchResult[]>((acc, chunk) => {
    const doc = docMap.get(chunk.docId);
    if (doc) {
      acc.push({
        docId: doc.id,
        title: doc.title,
        snippet: chunk.content,
        score: chunk.similarity,
        path: getItemPath(doc.id, docMap),
      });
    }
    return acc;
  }, []);
}

/**
 * Performs a multi-modal search for content and commands.
 * @param queryText The user's search query.
 * @param commandOptions Options needed by the command service.
 * @returns A promise that resolves to an array of grouped search results.
 */
export async function performSearch(
  queryText: string,
  commandOptions: SearchOptions // Pass options through
): Promise<SearchResultGroup[]> {
  const trimmedQuery = queryText.trim();
  const resultGroups: SearchResultGroup[] = [];

  const allDocs = await directoryService.getAllItems();
  const docMap = new Map<string, SchemaMetadata>(
    allDocs.map((doc) => [doc.id, doc])
  );

  const [contentResults, commandResults] = await Promise.all([
    trimmedQuery.length > 2
      ? findContent(trimmedQuery, docMap)
      : Promise.resolve([]),
    searchCommands(trimmedQuery, commandOptions), // Pass options through
  ]);

  // Order matters: show commands first as they are primary actions
  if (commandResults.length > 0) {
    resultGroups.push({ type: 'Commands', items: commandResults });
  }
  if (contentResults.length > 0) {
    resultGroups.push({ type: 'Knowledge', items: contentResults });
  }

  return resultGroups;
}

// Helper function for getting a document's path
function getItemPath(
  itemId: string,
  docMap: Map<string, SchemaMetadata>
): string {
  const pathParts: string[] = [];
  let currentItem = docMap.get(itemId);
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
