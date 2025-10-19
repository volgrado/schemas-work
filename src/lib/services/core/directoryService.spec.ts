/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'; // <-- FIX IS HERE
import { get } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import { DIRECTORY_STORAGE_KEY, LAST_ACTIVE_DOC_KEY } from '$lib/constants';

// Mock dependencies before any other imports
vi.mock('uuid', () => ({ v4: vi.fn() }));
vi.mock('$lib/services/core/errorService', () => ({ reportError: vi.fn() }));

import { v4 as uuidv4 } from 'uuid';
import * as directoryService from './directoryService';

describe('directoryService', () => {
  const MOCK_TIME = 1672531200000;

  const initialData: SchemaMetadata[] = [
    {
      id: 'folder-root',
      title: 'Folder A',
      createdAt: MOCK_TIME,
      updatedAt: MOCK_TIME,
      type: 'folder',
      parentId: null,
    },
    {
      id: 'schema-root',
      title: 'Schema 1',
      createdAt: MOCK_TIME,
      updatedAt: MOCK_TIME,
      type: 'schema',
      parentId: null,
    },
    {
      id: 'schema-child',
      title: 'Schema 2',
      createdAt: MOCK_TIME,
      updatedAt: MOCK_TIME,
      type: 'schema',
      parentId: 'folder-root',
    },
    {
      id: 'folder-child',
      title: 'Folder B',
      createdAt: MOCK_TIME,
      updatedAt: MOCK_TIME,
      type: 'folder',
      parentId: 'folder-root',
    },
    {
      id: 'schema-grandchild',
      title: 'Schema 3',
      createdAt: MOCK_TIME,
      updatedAt: MOCK_TIME,
      type: 'schema',
      parentId: 'folder-child',
    },
  ];

  const setInitialStorage = () => {
    localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(initialData));
  };

  const mockDeleteDatabase = vi.fn(() => {
    const request: {
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
      onblocked: (() => void) | null;
    } = { onsuccess: null, onerror: null, onblocked: null };

    setTimeout(() => {
      request.onsuccess?.();
    }, 0);

    return request;
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_TIME);
    localStorage.clear();
    vi.clearAllMocks();

    // FIX IS HERE: Use the imported `Mock` type directly for the cast
    (uuidv4 as Mock).mockReturnValue('new-item-id');

    vi.spyOn(window, 'dispatchEvent');
    Object.defineProperty(window, 'indexedDB', {
      value: { deleteDatabase: mockDeleteDatabase },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('CRUD Operations', () => {
    it('deleteItem should remove a single schema and its database', async () => {
      setInitialStorage();

      vi.useRealTimers();

      await directoryService.deleteItem('schema-root');

      const remaining = await directoryService.getAllItems();
      expect(remaining.find((i) => i.id === 'schema-root')).toBeUndefined();
      expect(mockDeleteDatabase).toHaveBeenCalledWith('schema-root');
    });

    it('deleteItem should recursively remove a folder and all its descendants', async () => {
      setInitialStorage();

      vi.useRealTimers();

      await directoryService.deleteItem('folder-root');

      const remaining = await directoryService.getAllItems();
      expect(remaining.map((i) => i.id)).toEqual(['schema-root']);
      expect(mockDeleteDatabase).toHaveBeenCalledWith('schema-child');
      expect(mockDeleteDatabase).toHaveBeenCalledWith('schema-grandchild');
    });
  });

  describe('Directory Traversal and Movement', () => {
    beforeEach(setInitialStorage);

    it('listItemsByParentId should return direct children (order-independent)', async () => {
      const rootItems = await directoryService.listItemsByParentId(null);
      const folderItems =
        await directoryService.listItemsByParentId('folder-root');

      expect(rootItems.map((i) => i.id)).toEqual(
        expect.arrayContaining(['folder-root', 'schema-root'])
      );
      expect(rootItems).toHaveLength(2);
      expect(folderItems.map((i) => i.id)).toEqual(
        expect.arrayContaining(['schema-child', 'folder-child'])
      );
      expect(folderItems).toHaveLength(2);
    });

    it('moveItem should correctly change an item parentId', async () => {
      await directoryService.moveItem('schema-root', 'folder-child');
      const movedItem = await directoryService.getItemById('schema-root');
      expect(movedItem?.parentId).toBe('folder-child');
    });

    it('should prevent moving a folder into itself', async () => {
      await expect(
        directoryService.moveItem('folder-root', 'folder-root')
      ).rejects.toThrow('Cannot move a folder into itself.');
    });

    it('should prevent moving a folder into one of its own subfolders', async () => {
      await expect(
        directoryService.moveItem('folder-root', 'folder-child')
      ).rejects.toThrow('Cannot move a folder into one of its own subfolders.');
    });
  });

  describe('Last Active Document', () => {
    it('should correctly set and get the last active document ID', async () => {
      await directoryService.setLastActiveDocId('doc-xyz');
      const retrievedId = await directoryService.getLastActiveDocId();
      expect(retrievedId).toBe('doc-xyz');
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should emit a "created" event when a new item appears in storage', () => {
      const newItem: SchemaMetadata = {
        id: 'new-id',
        title: 'New',
        type: 'schema',
        parentId: null,
        createdAt: MOCK_TIME,
        updatedAt: MOCK_TIME,
      };
      const event = new StorageEvent('storage', {
        key: DIRECTORY_STORAGE_KEY,
        oldValue: '[]',
        newValue: JSON.stringify([newItem]),
      });
      window.dispatchEvent(event);
      const eventData = get(directoryService.directoryEvents);
      expect(eventData).toEqual({ type: 'created', item: newItem });
    });

    it('should emit an "updated" event when an item changes in storage', () => {
      const oldItem = { ...initialData[1] };
      const updatedItem = { ...oldItem, title: 'Updated Title' };
      const event = new StorageEvent('storage', {
        key: DIRECTORY_STORAGE_KEY,
        oldValue: JSON.stringify([oldItem]),
        newValue: JSON.stringify([updatedItem]),
      });
      window.dispatchEvent(event);
      const eventData = get(directoryService.directoryEvents);
      expect(eventData).toEqual({ type: 'updated', item: updatedItem });
    });

    it('should emit a "deleted" event when an item is removed from storage', () => {
      const deletedItem = { ...initialData[1] };
      const event = new StorageEvent('storage', {
        key: DIRECTORY_STORAGE_KEY,
        oldValue: JSON.stringify([deletedItem]),
        newValue: '[]',
      });
      window.dispatchEvent(event);
      const eventData = get(directoryService.directoryEvents);
      expect(eventData).toEqual({ type: 'deleted', item: deletedItem });
    });
  });
});
