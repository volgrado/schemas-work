/**
 * @file Manages storing and retrieving recent search queries using localStorage.
 * @module recentSearchesService
 */

const STORAGE_KEY = 'app_recent_searches';
const MAX_RECENT_SEARCHES = 5; // Keep the list short and relevant
import * as errorService from '$lib/core/services/errorService';

/**
 * Retrieves the list of recent search queries.
 * @returns An array of strings.
 */
export function getRecentSearches(): string[] {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (storedValue) {
      return JSON.parse(storedValue);
    }
  } catch (error) {
    errorService.reportError(error as Error, {
      context: 'RecentSearches',
      action: 'getRecentSearches',
    });
    // If parsing fails, clear the invalid data
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

/**
 * Adds a new query to the recent searches list.
 * This function handles de-duplication and size limiting.
 * @param query The search query string to add.
 */
export function addRecentSearch(query: string): void {
  if (!query || query.trim().length < 3) return;

  const trimmedQuery = query.trim();
  const currentSearches = getRecentSearches();

  // Remove any existing instance of the same query to move it to the top
  const filteredSearches = currentSearches.filter(
    (item) => item.toLowerCase() !== trimmedQuery.toLowerCase()
  );

  // Add the new query to the beginning of the list
  const newSearches = [trimmedQuery, ...filteredSearches];

  // Limit the list to the max size
  const limitedSearches = newSearches.slice(0, MAX_RECENT_SEARCHES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedSearches));
  } catch (error) {
    errorService.reportError(error as Error, {
      context: 'RecentSearches',
      action: 'addRecentSearch',
    });
  }
}
