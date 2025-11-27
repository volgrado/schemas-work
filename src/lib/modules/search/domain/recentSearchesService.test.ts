import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as recentSearchesService from './recentSearchesService';
import * as errorService from '$lib/core/services/errorService';

// Mock the errorService
vi.mock('$lib/core/services/errorService', () => ({
  reportError: vi.fn(),
}));

describe('recentSearchesService', () => {
  const STORAGE_KEY = 'app_recent_searches';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getRecentSearches', () => {
    it('should return an empty array if no searches are stored', () => {
      const result = recentSearchesService.getRecentSearches();
      expect(result).toEqual([]);
    });

    it('should return stored searches if they exist', () => {
      const mockSearches = ['query1', 'query2'];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSearches));

      const result = recentSearchesService.getRecentSearches();
      expect(result).toEqual(mockSearches);
    });

    it('should handle JSON parse errors and report them', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');

      const result = recentSearchesService.getRecentSearches();

      expect(result).toEqual([]);
      expect(errorService.reportError).toHaveBeenCalledWith(expect.any(Error), {
        context: 'RecentSearches',
        action: 'getRecentSearches',
      });
      // Should clear invalid data
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('addRecentSearch', () => {
    it('should add a new search query to the beginning of the list', () => {
      recentSearchesService.addRecentSearch('new query');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored).toEqual(['new query']);
    });

    it('should ignore empty or short queries', () => {
      recentSearchesService.addRecentSearch('');
      recentSearchesService.addRecentSearch('ab');
      recentSearchesService.addRecentSearch('  ');

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
    });

    it('should move an existing query to the top (deduplication)', () => {
      const initial = ['old', 'query'];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));

      recentSearchesService.addRecentSearch('query');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored).toEqual(['query', 'old']);
      expect(stored.length).toBe(2);
    });

    it('should limit the list to 5 items', () => {
      const initial = ['query1', 'query2', 'query3', 'query4', 'query5'];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));

      recentSearchesService.addRecentSearch('query6');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored).toEqual([
        'query6',
        'query1',
        'query2',
        'query3',
        'query4',
      ]);
      expect(stored.length).toBe(5);
    });

    it('should trim whitespace from queries', () => {
      recentSearchesService.addRecentSearch('  trimmed  ');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(stored).toEqual(['trimmed']);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock setItem to throw
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage full');
        });

      recentSearchesService.addRecentSearch('valid query');

      expect(errorService.reportError).toHaveBeenCalledWith(expect.any(Error), {
        context: 'RecentSearches',
        action: 'addRecentSearch',
      });

      setItemSpy.mockRestore();
    });
  });
});
