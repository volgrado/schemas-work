/**
 * @file Manages the virtual file and folder hierarchy for user-created schemas.
 *
 * @remarks
 * This service provides a comprehensive CRUD (Create, Read, Update, Delete) interface
 * for managing `SchemaMetadata` objects, which represent the files (schemas) and folders
 * within the application. All metadata is persisted directly in `localStorage`, making
 * the application robustly offline-first.
 *
 * A key feature of this service is its real-time event system. It utilizes a Svelte
 * store (`directoryEvents`) and the browser's native `storage` event to synchronize
 * state across multiple browser tabs or windows. When a change is made in one tab
 * (e.g., creating a new folder), other tabs are notified and can update their UI
 * reactively and instantly.
 *
 * @see {@link SchemaMetadata} for the detailed structure of the items being managed.
 * @see {@link errorService} for the centralized error handling and reporting mechanism.
 */

import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import type { SchemaMetadata } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';

// --- Constants ---

/**
 * The key used to store the entire directory structure as a single JSON string
 * in `localStorage`.
 * @internal
 */
const DIRECTORY_STORAGE_KEY = 'schemas-work-directory';

/**
 * The key used to store the unique ID of the last active or viewed document in
 * `localStorage`, allowing the app to re-open it on next launch.
 * @internal
 */
const LAST_ACTIVE_DOC_KEY = 'schemas-work-last-active';

// =======================================================================
// EVENT ARCHITECTURE & CROSS-TAB SYNC
// =======================================================================

/**
 * A writable Svelte store that emits events whenever the directory structure is modified.
 *
 * @remarks
 * This allows different parts of the UI (e.g., a file tree component) to react to
 * changes in real-time. The event payload is an object containing the type of change
 * (`created`, `updated`, `deleted`) and the `SchemaMetadata` item that was affected.
 * A `null` value indicates that no event is currently active.
 *
 * @example
 * import { directoryEvents } from '$lib/services/core/directoryService';
 *
 * directoryEvents.subscribe(event => {
 *   if (event) {
 *     console.log(`Item ${event.item.id} was ${event.type}`);
 *     // Update UI based on the event
 *   }
 * });
 */
export const directoryEvents = writable<{
  type: 'created' | 'updated' | 'deleted';
  item: SchemaMetadata;
} | null>(null);

// Listen for storage changes made in other browser tabs to keep the directory synchronized.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === DIRECTORY_STORAGE_KEY) {
      try {
        const oldItems: SchemaMetadata[] = event.oldValue ? JSON.parse(event.oldValue) : [];
        const newItems: SchemaMetadata[] = event.newValue ? JSON.parse(event.newValue) : [];
        const newIds = new Set(newItems.map((i) => i.id));

        // Detect created or updated items by comparing the old and new lists
        for (const newItem of newItems) {
          const oldItem = oldItems.find((i) => i.id === newItem.id);
          if (!oldItem) {
            directoryEvents.set({ type: 'created', item: newItem });
          } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            directoryEvents.set({ type: 'updated', item: newItem });
          }
        }

        // Detect deleted items by finding items in the old list that are not in the new one
        for (const oldItem of oldItems) {
          if (!newIds.has(oldItem.id)) {
            directoryEvents.set({ type: 'deleted', item: oldItem });
          }
        }
      } catch (error) {
        errorService.reportError(error, {
          operation: 'storageEventListener',
          description: 'Failed to parse and diff directory data from a cross-tab storage event.',
        });
      }
    }
  });
}

// =======================================================================
// CRUD AND MANAGEMENT OPERATIONS
// =======================================================================

/**
 * Retrieves all items (schemas and folders) from the directory.
 * @returns A promise that resolves to an array of all `SchemaMetadata` items.
 */
export async function getAllItems(): Promise<SchemaMetadata[]> {
  if (typeof window === 'undefined') return [];
  const storedDirectory = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  try {
    return storedDirectory ? JSON.parse(storedDirectory) : [];
  } catch (error) {
    errorService.reportError(error, { operation: 'getAllItems', description: 'Failed to parse directory from localStorage.' });
    return []; // Return an empty array on error to prevent application crashes.
  }
}

/**
 * Lists all items that are direct children of a given parent folder ID.
 * @param parentId - The ID of the parent folder. Use `null` to list items at the root level.
 * @returns A promise that resolves to an array of child `SchemaMetadata` items.
 */
export async function listItemsByParentId(parentId: string | null): Promise<SchemaMetadata[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.parentId === parentId);
}

/**
 * Finds a single item by its unique identifier.
 * @param id - The ID of the item to retrieve.
 * @returns A promise that resolves to the `SchemaMetadata` item, or `undefined` if not found.
 */
export async function getItemById(id: string): Promise<SchemaMetadata | undefined> {
  const allItems = await getAllItems();
  return allItems.find((item) => item.id === id);
}

/**
 * Creates a new schema document metadata entry.
 * @param title - The title of the new schema.
 * @param parentId - The ID of the parent folder, or `null` for the root.
 * @returns A promise that resolves to the newly created `SchemaMetadata`.
 * @throws An error if an item with the same title already exists in the target location.
 */
export async function createSchema(title: string, parentId: string | null = null): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const siblingExists = allItems.some(
    (item) => item.parentId === parentId && item.title.toLowerCase() === title.toLowerCase()
  );
  if (siblingExists) {
    throw new Error(`An item named "${title}" already exists in this location.`);
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
 * @param title - The title of the new folder.
 * @param parentId - The ID of the parent folder, or `null` for the root.
 * @returns A promise that resolves to the newly created `SchemaMetadata`.
 * @throws An error if a folder with the same title already exists in the target location.
 */
export async function createFolder(title: string, parentId: string | null = null): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const siblingExists = allItems.some(
    (item) => item.parentId === parentId && item.title.toLowerCase() === title.toLowerCase()
  );
  if (siblingExists) {
    throw new Error(`A folder named "${title}" already exists in this location.`);
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
 * Updates an existing item's metadata (e.g., renaming).
 * @param id - The ID of the item to update.
 * @param updates - An object containing the properties of `SchemaMetadata` to update.
 * @returns A promise that resolves to the updated `SchemaMetadata`.
 * @throws An error if the item is not found, or if a naming conflict would occur.
 */
export async function updateItemMetadata(id: string, updates: Partial<Omit<SchemaMetadata, 'id'>>): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const itemIndex = allItems.findIndex((s) => s.id === id);
  if (itemIndex === -1) {
    const error = new Error(`Item not found for update: ${id}`);
    errorService.reportError(error, { operation: 'updateItemMetadata' });
    throw error;
  }

  const originalItem = allItems[itemIndex];
  // If the title is being changed, check for naming conflicts with siblings.
  if (updates.title) {
    const newTitle = updates.title.trim();
    const siblingExists = allItems.some(
      (item) =>
        item.parentId === originalItem.parentId &&
        item.id !== id &&
        item.title.toLowerCase() === newTitle.toLowerCase()
    );
    if (siblingExists) {
      throw new Error(`An item named "${newTitle}" already exists in this location.`);
    }
  }

  const updatedItem = { ...originalItem, ...updates, updatedAt: Date.now() };
  allItems[itemIndex] = updatedItem;
  await saveDirectory(allItems);
  return updatedItem;
}

/**
 * Deletes an item and, if it is a folder, all of its descendants recursively.
 *
 * @remarks
 * This function also handles the crucial task of deleting the corresponding IndexedDB
 * database for any `schema` being deleted, ensuring no orphaned data remains.
 *
 * @param itemId - The ID of the item to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export async function deleteItem(itemId: string): Promise<void> {
  let allItems = await getAllItems();
  const itemToDelete = allItems.find((item) => item.id === itemId);
  if (!itemToDelete) return; // Item already deleted, so do nothing.

  const itemsToDeleteIds = new Set<string>([itemId]);

  // If it's a folder, recursively find all descendant items (files and sub-folders).
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
    // For any item that is a schema, we must also delete its content database from IndexedDB.
    if (item?.type === 'schema' && typeof window !== 'undefined') {
      dbDeletionPromises.push(
        new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(id);
          request.onsuccess = () => resolve();
          request.onblocked = (event) => {
             console.warn(`Deletion of database ${id} is blocked. This can happen if a connection is still open.`, event);
             resolve(); // Resolve anyway to not block UI updates, but log a warning.
          };
          request.onerror = (event) => reject(request.error || event);
        })
      );
    }
  });

  // Create the new list of items by filtering out the ones marked for deletion.
  const updatedItems = allItems.filter((item) => !itemsToDeleteIds.has(item.id));

  // Save the updated directory state and wait for all database deletions to complete.
  await saveDirectory(updatedItems);
  await Promise.all(dbDeletionPromises);
}

/**
 * Moves an item to a new parent folder.
 * @param itemId - The ID of the item to move.
 * @param newParentId - The ID of the new parent folder. Use `null` to move to the root.
 * @throws An error if the move is invalid (e.g., moving a folder into itself or a descendant).
 */
export async function moveItem(itemId: string, newParentId: string | null): Promise<void> {
  const allItems = await getAllItems();
  const itemToMove = allItems.find((item) => item.id === itemId);
  if (!itemToMove) {
    throw new Error(`Item to move not found: ${itemId}`);
  }

  // Prevent invalid moves, such as moving a folder into itself or one of its own subfolders.
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
 * @returns A promise that resolves to the last active document ID, or `null` if not set.
 */
export async function getLastActiveDocId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ACTIVE_DOC_KEY);
}

/**
 * Sets the ID of the last viewed document in `localStorage`.
 * @param id - The ID of the document to be set as the last active one.
 * @returns A promise that resolves when the operation is complete.
 */
export async function setLastActiveDocId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVE_DOC_KEY, id);
}

/**
 * Saves the entire directory state to `localStorage` and manually dispatches a storage event.
 *
 * @remarks
 * Manually dispatching the event is crucial because the `storage` event only fires
 * for *other* tabs, not the one that initiated the change. This ensures that the
 * UI in the current tab can react to the change immediately.
 *
 * @param items - The complete array of `SchemaMetadata` to save.
 * @internal
 */
export async function saveDirectory(items: SchemaMetadata[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const oldValue = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  const newValue = JSON.stringify(items);

  if (oldValue === newValue) return; // Do nothing if there are no changes.

  localStorage.setItem(DIRECTORY_STORAGE_KEY, newValue);

  // Dispatch the event so the current tab's UI can also react.
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: DIRECTORY_STORAGE_KEY,
      oldValue: oldValue,
      newValue: newValue,
    })
  );
}

/**
 * Clears the entire directory from `localStorage`. Primarily used for testing or reset operations.
 * @internal
 */
export async function clearDirectory(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DIRECTORY_STORAGE_KEY);
}
