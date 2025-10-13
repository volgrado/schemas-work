import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as directoryService from './directoryService';
import type { SchemaMetadata } from '$lib/types';

describe.skip('directoryService', () => {
  const mockItems: SchemaMetadata[] = [
    {
      id: '1',
      title: 'Folder 1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: 'folder',
      parentId: null,
    },
    {
      id: '2',
      title: 'Schema 1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: 'schema',
      parentId: '1',
    },
    {
      id: '3',
      title: 'Schema 2',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: 'schema',
      parentId: null,
    },
  ];

  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorage.setItem(
      'schemas-work-directory',
      JSON.stringify(mockItems),
    );
  });

  it('should get all items', async () => {
    const items = await directoryService.getAllItems();
    expect(items).toEqual(mockItems);
  });

  it('should list items by parent ID', async () => {
    const items = await directoryService.listItemsByParentId('1');
    expect(items).toEqual([mockItems[1]]);
  });

  it('should get an item by ID', async () => {
    const item = await directoryService.getItemById('2');
    expect(item).toEqual(mockItems[1]);
  });

  it('should create a schema', async () => {
    const newSchema = await directoryService.createSchema('New Schema');
    expect(newSchema.title).toBe('New Schema');
    expect(newSchema.type).toBe('schema');
  });

  it('should create a folder', async () => {
    const newFolder = await directoryService.createFolder('New Folder');
    expect(newFolder.title).toBe('New Folder');
    expect(newFolder.type).toBe('folder');
  });

  it('should update item metadata', async () => {
    const updatedItem = await directoryService.updateItemMetadata('2', {
      title: 'Updated Schema',
    });
    expect(updatedItem.title).toBe('Updated Schema');
  });

  it('should delete an item', async () => {
    await directoryService.deleteItem('2');
    const updatedItems = await directoryService.getAllItems();
    expect(updatedItems).toHaveLength(2);
    expect(updatedItems[0].id).toBe('1');
    expect(updatedItems[1].id).toBe('3');
  });
});