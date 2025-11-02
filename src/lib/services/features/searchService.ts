import * as neuralIndexService from '$lib/services/ai/neuralIndexService';
import * as directoryService from '$lib/services/core/directoryService';
import type { SchemaMetadata } from '$lib/types';
import { searchCommands, type SearchOptions } from './commandService';
import type { SearchResultGroup } from '$lib/types/command';

export interface SearchResult {
  docId: string;
  title: string;
  snippet: string;
  score: number;
  path?: string;
  nodeId?: string;
}

// --- NEW HELPER FUNCTION: This is the core of the new feature ---
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
  if (!fullText || !query) return fullText;

  const queryWords = query.trim().toLowerCase().split(/\s+/);
  const lowerCaseText = fullText.toLowerCase();
  let firstMatchIndex = -1;

  // Find the first word from the query that exists in the text
  for (const word of queryWords) {
    const index = lowerCaseText.indexOf(word);
    if (index !== -1) {
      firstMatchIndex = index;
      break;
    }
  }

  // If no match is found, just return the beginning of the text
  if (firstMatchIndex === -1) {
    return fullText.length > maxLength
      ? fullText.substring(0, maxLength) + '...'
      : fullText;
  }

  // Calculate the ideal start position to center the match
  const idealStart = Math.max(0, firstMatchIndex - Math.floor(maxLength / 2));

  // Adjust the start to the beginning of a word for readability
  const start =
    idealStart === 0 ? 0 : fullText.lastIndexOf(' ', idealStart) + 1;

  // Extract the snippet
  let snippet = fullText.substring(start, start + maxLength);

  // Add ellipses
  if (start > 0) {
    snippet = '... ' + snippet;
  }
  if (start + maxLength < fullText.length) {
    snippet = snippet + ' ...';
  }

  return snippet;
}

async function findContent(
  queryText: string,
  docMap: Map<string, SchemaMetadata>
): Promise<SearchResult[]> {
  const topChunks = await neuralIndexService.findSimilarChunksAcrossVault(
    queryText,
    10
  );

  const results: (SearchResult | null)[] = topChunks.map((chunk) => {
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
      path: getItemPath(chunk.docId, docMap) || undefined, // <- ajuste clave
      nodeId: chunk.nodeId,
    } satisfies SearchResult; // <- fuerza compatibilidad estructural
  });

  // TypeScript reconoce correctamente el resultado como SearchResult[]
  return results.filter((r): r is SearchResult => r !== null);
}

// ... The rest of the file (performSearch, getItemPath) is correct and unchanged ...
export async function performSearch(
  queryText: string,
  commandOptions: SearchOptions
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
    searchCommands(trimmedQuery, commandOptions),
  ]);
  if (commandResults.length > 0)
    resultGroups.push({ type: 'Commands', items: commandResults });
  if (contentResults.length > 0)
    resultGroups.push({ type: 'Knowledge', items: contentResults });
  return resultGroups;
}

function getItemPath(
  itemId: string,
  docMap: Map<string, SchemaMetadata>
): string {
  const pathParts: string[] = [];
  let currentItem = docMap.get(itemId);
  while (currentItem?.parentId) {
    const parent = docMap.get(currentItem.parentId);
    if (parent) pathParts.unshift(parent.title);
    else break;
  }
  return pathParts.join(' / ');
}
