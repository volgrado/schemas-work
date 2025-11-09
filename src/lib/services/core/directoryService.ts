/**
 * @file Manages the virtual file and folder hierarchy for user-created schemas.
 *   This service uses localStorage for persistence and provides a reactive store
 *   to notify the application of changes.
 * @module directoryService
 */

import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import type { SchemaMetadata } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';
import { DIRECTORY_STORAGE_KEY, LAST_ACTIVE_DOC_KEY } from '$lib/constants';

// --- REACTIVE EVENT EMITTER ---

export interface DirectoryEvent {
  type: 'created' | 'updated' | 'deleted' | 'reloaded';
  item: SchemaMetadata | SchemaMetadata[]; // Allow for single item or full reload
}

/**
 * A writable Svelte store that emits events when the directory changes.
 * Components can subscribe to this store to reactively update their UI.
 * This replaces the `$state` rune, which is only valid inside .svelte files.
 */
export const directoryEvent = writable<DirectoryEvent | null>(null);

// --- INITIALIZATION FUNCTION ---

/**
 * Sets up a listener for localStorage changes to sync directory state across browser tabs.
 * @returns A cleanup function to remove the event listener.
 */
export function initializeDirectoryListener(): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // Return a no-op function for server-side rendering
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== DIRECTORY_STORAGE_KEY) return;

    try {
      // When another tab changes the storage, emit a 'reloaded' event
      // to signal that the entire directory might have changed.
      const newItems: SchemaMetadata[] = event.newValue
        ? JSON.parse(event.newValue)
        : [];
      directoryEvent.set({ type: 'reloaded', item: newItems });
    } catch (error) {
      errorService.reportError(error, { operation: 'storageEventListener' });
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Return the cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

// =================================================================
// --- PUBLIC API (CRUD & UTILITIES) ---
// =================================================================

/**
 * Retrieves all items from the directory in localStorage.
 * @returns A promise that resolves to an array of SchemaMetadata.
 */
export async function getAllItems(): Promise<SchemaMetadata[]> {
  if (typeof window === 'undefined') return [];
  const storedDirectory = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  try {
    return storedDirectory ? JSON.parse(storedDirectory) : [];
  } catch (error) {
    errorService.reportError(error, { operation: 'getAllItems' });
    return []; // Return an empty array on parsing error
  }
}

/**
 * Lists all items that are direct children of a given parent ID.
 * @param parentId - The ID of the parent folder, or null for the root.
 * @returns A promise resolving to an array of child items.
 */
export async function listItemsByParentId(
  parentId: string | null
): Promise<SchemaMetadata[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.parentId === parentId);
}

/**
 * Finds a single item in the directory by its unique ID.
 * @param id - The ID of the item to retrieve.
 * @returns A promise resolving to the found item or undefined.
 */
export async function getItemById(
  id: string
): Promise<SchemaMetadata | undefined> {
  const allItems = await getAllItems();
  return allItems.find((item) => item.id === id);
}

/**
 * Creates a new schema metadata object and saves it to the directory.
 * @param title - The title for the new schema.
 * @param parentId - The ID of the parent folder, or null for the root.
 * @returns A promise resolving to the newly created schema metadata.
 */
export async function createSchema(
  title: string,
  parentId: string | null = null
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const siblingExists = allItems.some(
    (item) =>
      item.parentId === parentId &&
      item.title.toLowerCase() === title.trim().toLowerCase()
  );
  if (siblingExists) {
    throw new Error(
      `An item named "${title}" already exists in this location.`
    );
  }

  const now = Date.now();
  const newSchema: SchemaMetadata = {
    id: uuidv4(),
    title: title.trim(),
    createdAt: now,
    updatedAt: now,
    type: 'schema',
    parentId,
  };

  await saveDirectory([...allItems, newSchema]);
  directoryEvent.set({ type: 'created', item: newSchema }); // Emit event
  return newSchema;
}

/**
 * Creates a new folder metadata object and saves it to the directory.
 * @param title - The title for the new folder.
 * @param parentId - The ID of the parent folder, or null for the root.
 * @returns A promise resolving to the newly created folder metadata.
 */
export async function createFolder(
  title: string,
  parentId: string | null = null
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const siblingExists = allItems.some(
    (item) =>
      item.parentId === parentId &&
      item.title.toLowerCase() === title.trim().toLowerCase()
  );
  if (siblingExists) {
    throw new Error(
      `A folder named "${title}" already exists in this location.`
    );
  }

  const now = Date.now();
  const newFolder: SchemaMetadata = {
    id: uuidv4(),
    title: title.trim(),
    createdAt: now,
    updatedAt: now,
    type: 'folder',
    parentId,
  };

  await saveDirectory([...allItems, newFolder]);
  directoryEvent.set({ type: 'created', item: newFolder }); // Emit event
  return newFolder;
}

/**
 * Updates an existing item's metadata.
 * @param id - The ID of the item to update.
 * @param updates - An object with the properties to update.
 * @returns A promise resolving to the updated item metadata.
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

  // Check for title conflicts if the title is being changed
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
  directoryEvent.set({ type: 'updated', item: updatedItem }); // Emit event
  return updatedItem;
}

/**
 * Deletes an item and all its descendants (if it's a folder).
 * Also handles deletion of associated IndexedDB databases for schemas.
 * @param itemId - The ID of the item to delete.
 */
export async function deleteItem(itemId: string): Promise<void> {
  let allItems = await getAllItems();
  const itemToDelete = allItems.find((item) => item.id === itemId);
  if (!itemToDelete) return; // Item already deleted

  const itemsToDeleteIds = new Set<string>([itemId]);

  // If it's a folder, recursively find all children to delete
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

  // For any schemas being deleted, also delete their IndexedDB database
  const dbDeletionPromises: Promise<void>[] = [];
  if (typeof window !== 'undefined') {
    itemsToDeleteIds.forEach((id) => {
      const item = allItems.find((i) => i.id === id);
      if (item?.type === 'schema') {
        dbDeletionPromises.push(
          new Promise<void>((resolve, reject) => {
            const request = window.indexedDB.deleteDatabase(id);
            request.onsuccess = () => resolve();
            request.onblocked = (event) => {
              console.warn(`Deletion of database ${id} is blocked.`, event);
              resolve(); // Resolve anyway to not block UI
            };
            request.onerror = (event) => reject(request.error || event);
          })
        );
      }
    });
  }

  const updatedItems = allItems.filter(
    (item) => !itemsToDeleteIds.has(item.id)
  );
  await saveDirectory(updatedItems);
  await Promise.all(dbDeletionPromises); // Wait for DB deletions to complete

  directoryEvent.set({ type: 'deleted', item: itemToDelete }); // Emit event
}

/**
 * Moves an item to a new parent folder.
 * @param itemId - The ID of the item to move.
 * @param newParentId - The ID of the new parent folder, or null for the root.
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
  if (itemToMove.parentId === newParentId) {
    return; // No change needed
  }

  // Prevent moving a folder into itself or one of its own children
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
  directoryEvent.set({
    type: 'updated',
    item: { ...itemToMove, parentId: newParentId },
  }); // Emit event
}

// --- SESSION STATE HELPERS ---

/**
 * Gets the ID of the last active document from localStorage.
 */
export async function getLastActiveDocId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ACTIVE_DOC_KEY);
}

/**
 * Sets the ID of the last active document in localStorage.
 * @param id - The ID of the document.
 */
export async function setLastActiveDocId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVE_DOC_KEY, id);
}

// --- CORE STORAGE FUNCTIONS ---

/**
 * Saves the entire directory array to localStorage.
 * @param items - The array of all SchemaMetadata items.
 */
export async function saveDirectory(items: SchemaMetadata[]): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Clears the entire directory from localStorage.
 */
export async function clearDirectory(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DIRECTORY_STORAGE_KEY);
}
