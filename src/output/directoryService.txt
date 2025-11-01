/**
 * @file Manages the virtual file and folder hierarchy for user-created schemas.
 * @module directoryService
 *
 * @remarks
 * This service is the backbone of the application's file management system. It provides a complete
 * CRUD (Create, Read, Update, Delete) interface for `SchemaMetadata` objects, which represent
 * both the schema documents (files) and the folders that contain them.
 *
 * Key Architectural Decisions:
 * - **Offline-First Persistence**: The entire directory structure is stored as a single JSON object
 *   in `localStorage`. This makes the application inherently offline-first, as all file and folder
 *   metadata is available immediately on load without needing a network request.
 *
 * - **Cross-Tab Synchronization**: The service uses a combination of a Svelte store (`directoryEvents`)
 *   and the browser's `storage` event to achieve real-time synchronization across multiple open tabs.
 *   When a change is made in one tab, the `localStorage` is updated, which triggers the `storage`
 *   event in all other tabs. This service listens for that event and emits a change on the
 *   `directoryEvents` store, allowing the UI in other tabs to update reactively.
 *
 * - **Separation of Concerns**: This service is strictly responsible for the *metadata* of the files
 *   and folders (e.g., title, parentId, timestamps). The actual *content* of the schema documents
 *   is handled by the `documentService` and `persistenceService`.
 */

import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import type { SchemaMetadata } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';
import { DIRECTORY_STORAGE_KEY, LAST_ACTIVE_DOC_KEY } from '$lib/constants';

/**
 * A writable Svelte store that emits events when the directory is modified.
 *
 * @remarks
 * The event payload contains the change type (`created`, `updated`, `deleted`)
 * and the affected `SchemaMetadata` item.
 */
export const directoryEvents = writable<{
  type: 'created' | 'updated' | 'deleted';
  item: SchemaMetadata;
} | null>(null);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === DIRECTORY_STORAGE_KEY) {
      try {
        const oldItems: SchemaMetadata[] = event.oldValue
          ? JSON.parse(event.oldValue)
          : [];
        const newItems: SchemaMetadata[] = event.newValue
          ? JSON.parse(event.newValue)
          : [];
        const newIds = new Set(newItems.map((i) => i.id));

        for (const newItem of newItems) {
          const oldItem = oldItems.find((i) => i.id === newItem.id);
          if (!oldItem) {
            directoryEvents.set({ type: 'created', item: newItem });
          } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            directoryEvents.set({ type: 'updated', item: newItem });
          }
        }

        for (const oldItem of oldItems) {
          if (!newIds.has(oldItem.id)) {
            directoryEvents.set({ type: 'deleted', item: oldItem });
          }
        }
      } catch (error) {
        errorService.reportError(error, {
          operation: 'storageEventListener',
          description:
            'Failed to sync directory data from cross-tab storage event.',
        });
      }
    }
  });
}

/**
 * Retrieves all items (schemas and folders) from the directory.
 * @returns {Promise<SchemaMetadata[]>} A promise that resolves to an array of all `SchemaMetadata` items.
 */
export async function getAllItems(): Promise<SchemaMetadata[]> {
  if (typeof window === 'undefined') return [];
  const storedDirectory = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  try {
    return storedDirectory ? JSON.parse(storedDirectory) : [];
  } catch (error) {
    errorService.reportError(error, {
      operation: 'getAllItems',
      description: 'Failed to parse directory from localStorage.',
    });
    return [];
  }
}

/**
 * Lists all items that are direct children of a given parent folder ID.
 * @param {string | null} parentId The ID of the parent folder, or `null` for the root.
 * @returns {Promise<SchemaMetadata[]>} A promise that resolves to an array of child `SchemaMetadata` items.
 */
export async function listItemsByParentId(
  parentId: string | null
): Promise<SchemaMetadata[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.parentId === parentId);
}

/**
 * Finds a single item by its unique identifier.
 * @param {string} id The ID of the item to retrieve.
 * @returns {Promise<SchemaMetadata | undefined>} A promise that resolves to the `SchemaMetadata` item, or `undefined` if not found.
 */
export async function getItemById(
  id: string
): Promise<SchemaMetadata | undefined> {
  const allItems = await getAllItems();
  return allItems.find((item) => item.id === id);
}

/**
 * Creates a new schema document metadata entry.
 * @param {string} title The title of the new schema.
 * @param {string | null} [parentId=null] The ID of the parent folder, or `null` for the root.
 * @returns {Promise<SchemaMetadata>} A promise that resolves to the newly created `SchemaMetadata`.
 */
export async function createSchema(
  title: string,
  parentId: string | null = null
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const siblingExists = allItems.some(
    (item) =>
      item.parentId === parentId &&
      item.title.toLowerCase() === title.toLowerCase()
  );
  if (siblingExists) {
    throw new Error(
      `An item named "${title}" already exists in this location.`
    );
  }

  const now = Date.now();
  const newSchema: SchemaMetadata = {
    id: uuidv4(),
    title,
    createdAt: now,
    updatedAt: now,
    type: 'schema',
    parentId,
  };
  await saveDirectory([...allItems, newSchema]);
  return newSchema;
}

/**
 * Creates a new folder metadata entry.
 * @param {string} title The title of the new folder.
 * @param {string | null} [parentId=null] The ID of the parent folder, or `null` for the root.
 * @returns {Promise<SchemaMetadata>} A promise that resolves to the newly created `SchemaMetadata`.
 */
export async function createFolder(
  title: string,
  parentId: string | null = null
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const siblingExists = allItems.some(
    (item) =>
      item.parentId === parentId &&
      item.title.toLowerCase() === title.toLowerCase()
  );
  if (siblingExists) {
    throw new Error(
      `A folder named "${title}" already exists in this location.`
    );
  }

  const now = Date.now();
  const newFolder: SchemaMetadata = {
    id: uuidv4(),
    title,
    createdAt: now,
    updatedAt: now,
    type: 'folder',
    parentId,
  };
  await saveDirectory([...allItems, newFolder]);
  return newFolder;
}

/**
 * Updates an existing item's metadata.
 * @param {string} id The ID of the item to update.
 * @param {Partial<Omit<SchemaMetadata, 'id'>>} updates An object with the properties to update.
 * @returns {Promise<SchemaMetadata>} A promise that resolves to the updated `SchemaMetadata`.
 */
export async function updateItemMetadata(
  id: string,
  updates: Partial<Omit<SchemaMetadata, 'id'>>
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const itemIndex = allItems.findIndex((s) => s.id === id);
  if (itemIndex === -1) {
    const error = new Error(`Item not found for update: ${id}`);
    errorService.reportError(error, { operation: 'updateItemMetadata' });
    throw error;
  }

  const originalItem = allItems[itemIndex];
  if (updates.title) {
    const newTitle = updates.title.trim();
    const siblingExists = allItems.some(
      (item) =>
        item.parentId === originalItem.parentId &&
        item.id !== id &&
        item.title.toLowerCase() === newTitle.toLowerCase()
    );
    if (siblingExists) {
      throw new Error(
        `An item named "${newTitle}" already exists in this location.`
      );
    }
  }

  const updatedItem = { ...originalItem, ...updates, updatedAt: Date.now() };
  allItems[itemIndex] = updatedItem;
  await saveDirectory(allItems);
  return updatedItem;
}

/**
 * Deletes an item and, if it is a folder, all of its descendants recursively.
 * @param {string} itemId The ID of the item to delete.
 * @returns {Promise<void>} A promise that resolves when the deletion is complete.
 */
export async function deleteItem(itemId: string): Promise<void> {
  let allItems = await getAllItems();
  const itemToDelete = allItems.find((item) => item.id === itemId);
  if (!itemToDelete) return;

  const itemsToDeleteIds = new Set<string>([itemId]);

  if (itemToDelete.type === 'folder') {
    const findChildrenRecursive = (parentId: string) => {
      const children = allItems.filter((item) => item.parentId === parentId);
      for (const child of children) {
        itemsToDeleteIds.add(child.id);
        if (child.type === 'folder') {
          findChildrenRecursive(child.id);
        }
      }
    };
    findChildrenRecursive(itemId);
  }

  const dbDeletionPromises: Promise<void>[] = [];
  itemsToDeleteIds.forEach((id) => {
    const item = allItems.find((i) => i.id === id);
    if (item?.type === 'schema' && typeof window !== 'undefined') {
      dbDeletionPromises.push(
        new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(id);
          request.onsuccess = () => resolve();
          request.onblocked = (event) => {
            console.warn(`Deletion of database ${id} is blocked.`, event);
            resolve();
          };
          request.onerror = (event) => reject(request.error || event);
        })
      );
    }
  });

  const updatedItems = allItems.filter(
    (item) => !itemsToDeleteIds.has(item.id)
  );

  await saveDirectory(updatedItems);
  await Promise.all(dbDeletionPromises);
}

/**
 * Moves an item to a new parent folder.
 * @param {string} itemId The ID of the item to move.
 * @param {string | null} newParentId The ID of the new parent folder, or `null` for the root.
 * @returns {Promise<void>} A promise that resolves when the move is complete.
 */
export async function moveItem(
  itemId: string,
  newParentId: string | null
): Promise<void> {
  const allItems = await getAllItems();
  const itemToMove = allItems.find((item) => item.id === itemId);
  if (!itemToMove) {
    throw new Error(`Item to move not found: ${itemId}`);
  }

  if (itemToMove.type === 'folder') {
    if (itemId === newParentId) {
      throw new Error('Cannot move a folder into itself.');
    }
    let currentParentId = newParentId;
    while (currentParentId !== null) {
      if (currentParentId === itemId) {
        throw new Error('Cannot move a folder into one of its own subfolders.');
      }
      const parent = allItems.find((item) => item.id === currentParentId);
      currentParentId = parent ? parent.parentId : null;
    }
  }

  const updatedItems = allItems.map((item) => {
    if (item.id === itemId) {
      return { ...item, parentId: newParentId, updatedAt: Date.now() };
    }
    return item;
  });
  await saveDirectory(updatedItems);
}

/**
 * Gets the ID of the last viewed document from `localStorage`.
 * @returns {Promise<string | null>} A promise that resolves to the last active document ID, or `null`.
 */
export async function getLastActiveDocId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ACTIVE_DOC_KEY);
}

/**
 * Sets the ID of the last viewed document in `localStorage`.
 * @param {string} id The ID of the document to set as last active.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function setLastActiveDocId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVE_DOC_KEY, id);
}

/**
 * Saves the entire directory state to `localStorage` and dispatches a storage event.
 * @param {SchemaMetadata[]} items The complete array of `SchemaMetadata` to save.
 * @returns {Promise<void>} A promise that resolves when the directory is saved.
 * @internal
 */
export async function saveDirectory(items: SchemaMetadata[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const oldValue = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  const newValue = JSON.stringify(items);

  if (oldValue === newValue) return;

  localStorage.setItem(DIRECTORY_STORAGE_KEY, newValue);

  window.dispatchEvent(
    new StorageEvent('storage', {
      key: DIRECTORY_STORAGE_KEY,
      oldValue: oldValue,
      newValue: newValue,
    })
  );
}

/**
 * Clears the entire directory from `localStorage`.
 * @returns {Promise<void>} A promise that resolves when the directory is cleared.
 * @internal
 */
export async function clearDirectory(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DIRECTORY_STORAGE_KEY);
}
