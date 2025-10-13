import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import type { SchemaMetadata } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';

// --- Constantes ---
const DIRECTORY_STORAGE_KEY = 'schemas-work-directory';
const LAST_ACTIVE_DOC_KEY = 'schemas-work-last-active';

// ========================================================================
// ARQUITECTURA DE EVENTOS Y SINCRONIZACIÓN
// ========================================================================

/**
 * A Svelte store that broadcasts directory change events.
 * This allows for a reactive and decoupled architecture where different parts of the application
 * can respond to creations, updates, and deletions of directory items without being directly
 * coupled to this service.
 */
export const directoryEvents = writable<{
  type: 'created' | 'updated' | 'deleted';
  item: SchemaMetadata; // The full item is sent to provide context to subscribers.
} | null>(null);

/**
 * Sets up a 'storage' event listener to synchronize directory state across multiple tabs.
 * `localStorage` does not notify the originating tab of a change. To unify logic and ensure
 * that both the active tab and background tabs react in the same way, all event emissions are
 * centralized in this listener. It becomes the single source of truth for directory events.
 * The `saveDirectory` function manually dispatches this event to "trick" the active tab
 * into following the same flow.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // Only react to changes in our specific key.
    if (event.key === DIRECTORY_STORAGE_KEY) {
      console.log('[directoryService] Storage event processed.');

      // Parse the old and new states to compare them.
      try {
        const oldItems: SchemaMetadata[] = event.oldValue
          ? JSON.parse(event.oldValue)
          : [];
        const newItems: SchemaMetadata[] = event.newValue
          ? JSON.parse(event.newValue)
          : [];

        const oldIds = new Set(oldItems.map((i) => i.id));
        const newIds = new Set(newItems.map((i) => i.id));

        // "Diffing" logic to determine what has changed:

        // 1. Detect creations and updates
        for (const newItem of newItems) {
          const oldItem = oldItems.find((i) => i.id === newItem.id);
          if (!oldItem) {
            // If the item did not exist before, it's a CREATION.
            directoryEvents.set({ type: 'created', item: newItem });
          } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            // If it existed but its content has changed, it's an UPDATE.
            directoryEvents.set({ type: 'updated', item: newItem });
          }
        }

        // 2. Detect deletions
        for (const oldItem of oldItems) {
          if (!newIds.has(oldItem.id)) {
            // If an item existed before but no longer does, it's a DELETION.
            directoryEvents.set({ type: 'deleted', item: oldItem });
          }
        }
      } catch (error) {
        errorService.reportError(error, {
          operation: 'storageEventListener',
          description:
            'Failed to parse old/new data from the storage event.',
        });
      }
    }
  });
}

/**
 * Retrieves the complete list of all items. This is the basis for other functions.
 * Includes error handling in case the data in localStorage is corrupted.
 * @returns {Promise<SchemaMetadata[]>} A promise that resolves to the list of all items.
 */
export async function getAllItems(): Promise<SchemaMetadata[]> {
  if (typeof window === 'undefined') return [];
  const storedDirectory = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  try {
    return storedDirectory ? JSON.parse(storedDirectory) : [];
  } catch (error) {
    errorService.reportError(error, {
      operation: 'getAllItems',
      description:
        'Failed to parse directory from localStorage. Data might be corrupt.',
    });
    return []; // Return a safe state.
  }
}

/**
 * Retrieves items that are direct children of a specific parent.
 * @param {string | null} parentId - The ID of the parent item.
 * @returns {Promise<SchemaMetadata[]>} A promise that resolves to a list of child items.
 */
export async function listItemsByParentId(
  parentId: string | null,
): Promise<SchemaMetadata[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.parentId === parentId);
}

/**
 * Retrieves the metadata for a specific item by its ID.
 * @param {string} id - The ID of the item to retrieve.
 * @returns {Promise<SchemaMetadata | undefined>} A promise that resolves to the item's metadata or undefined if not found.
 */
export async function getItemById(
  id: string,
): Promise<SchemaMetadata | undefined> {
  const allItems = await getAllItems();
  return allItems.find((item) => item.id === id);
}

/**
 * Creates the metadata for a new schema and persists the change.
 * Event notification is delegated to `saveDirectory`.
 * @param {string} title - The title of the new schema.
 * @param {string | null} [parentId=null] - The ID of the parent folder.
 * @returns {Promise<SchemaMetadata>} A promise that resolves to the newly created schema's metadata.
 */
export async function createSchema(
  title: string,
  parentId: string | null = null,
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const now = Date.now();
  const newSchema: SchemaMetadata = {
    id: uuidv4(),
    title,
    createdAt: now,
    updatedAt: now,
    type: 'schema',
    parentId,
  };
  const updatedItems = [...allItems, newSchema];
  await saveDirectory(updatedItems);
  return newSchema;
}

/**
 * Creates the metadata for a new folder and persists the change.
 * Event notification is delegated to `saveDirectory`.
 * @param {string} title - The title of the new folder.
 * @param {string | null} [parentId=null] - The ID of the parent folder.
 * @returns {Promise<SchemaMetadata>} A promise that resolves to the newly created folder's metadata.
 */
export async function createFolder(
  title: string,
  parentId: string | null = null,
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const now = Date.now();
  const newFolder: SchemaMetadata = {
    id: uuidv4(),
    title,
    createdAt: now,
    updatedAt: now,
    type: 'folder',
    parentId,
  };
  const updatedItems = [...allItems, newFolder];
  await saveDirectory(updatedItems);
  return newFolder;
}

/**
 * Updates the metadata of an existing item and persists the change.
 * Event notification is delegated to `saveDirectory`.
 * @param {string} id - The ID of the item to update.
 * @param {Partial<Omit<SchemaMetadata, 'id'>>} updates - An object with the properties to update.
 * @returns {Promise<SchemaMetadata>} A promise that resolves to the updated item's metadata.
 */
export async function updateItemMetadata(
  id: string,
  updates: Partial<Omit<SchemaMetadata, 'id'>>,
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const itemIndex = allItems.findIndex((s) => s.id === id);

  if (itemIndex === -1) {
    const error = new Error(`Item not found for update: ${id}`);
    errorService.reportError(error, {
      operation: 'updateItemMetadata',
      itemId: id,
      updates,
    });
    throw error;
  }

  const updatedItem = {
    ...allItems[itemIndex],
    ...updates,
    updatedAt: Date.now(),
  };
  allItems[itemIndex] = updatedItem;
  await saveDirectory(allItems);
  return updatedItem;
}

/**
 * Deletes an item (and its children if it's a folder) and persists the change.
 * Event notification is delegated to `saveDirectory`.
 * @param {string} itemId - The ID of the item to delete.
 * @returns {Promise<void>} A promise that resolves when the item has been deleted.
 */
export async function deleteItem(itemId: string): Promise<void> {
  let allItems = await getAllItems();
  const itemToDelete = allItems.find((item) => item.id === itemId);
  if (!itemToDelete) return;

  const itemsToDeleteIds: Set<string> = new Set([itemId]);

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
  for (const id of itemsToDeleteIds) {
    const item = allItems.find((i) => i.id === id);
    if (item && item.type === 'schema') {
      dbDeletionPromises.push(
        new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(id);
          request.onsuccess = () => resolve();
          request.onerror = (event) => {
            errorService.reportError(request.error || event, {
              operation: 'deleteItem.indexedDB.deleteDatabase',
              itemId: id,
            });
            reject(request.error || event);
          };
          request.onblocked = (event) => {
            const error = new Error(
              `Database deletion blocked for item ID: ${id}`,
            );
            errorService.reportError(error, {
              operation: 'deleteItem.indexedDB.onblocked',
              itemId: id,
            });
            reject(error);
          };
        }),
      );
    }
  }

  const updatedItems = allItems.filter(
    (item) => !itemsToDeleteIds.has(item.id),
  );
  await saveDirectory(updatedItems);

  try {
    await Promise.all(dbDeletionPromises);
  } catch (error) {
    throw error;
  }
}

/**
 * Gets the ID of the last active document from localStorage.
 * @returns {Promise<string | null>} A promise that resolves to the last active document ID or null.
 */
export async function getLastActiveDocId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ACTIVE_DOC_KEY);
}

/**
 * Saves the ID of the last active document to localStorage.
 * @param {string} id - The ID of the document to set as last active.
 * @returns {Promise<void>} A promise that resolves when the ID has been saved.
 */
export async function setLastActiveDocId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVE_DOC_KEY, id);
}

/**
 * Saves a complete directory to localStorage and notifies ALL tabs (including the current one)
 * about the change by dispatching a `storage` event. This is now the ONLY function that
 * directly interacts with localStorage for writing.
 *
 * By centralizing writing and notification in this low-level function, we ensure that every
 * change, regardless of its origin, consistently triggers the reactive flow. This eliminates
 * the need to manually emit events in each high-level function (create, update, delete),
 * simplifying the code and reducing errors.
 * @param {SchemaMetadata[]} items - The array of items to save.
 * @returns {Promise<void>} A promise that resolves when the directory has been saved.
 */
export async function saveDirectory(items: SchemaMetadata[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const oldValue = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  const newValue = JSON.stringify(items);

  // Avoid dispatching events if nothing has actually changed.
  if (oldValue === newValue) return;

  localStorage.setItem(DIRECTORY_STORAGE_KEY, newValue);

  // Manually dispatch the `storage` event. The browser only does this for other tabs,
  // but by doing it ourselves, we force the listener in this same tab to also activate,
  // unifying the event flow.
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: DIRECTORY_STORAGE_KEY,
      oldValue: oldValue,
      newValue: newValue,
    }),
  );
}

/**
 * Completely clears the metadata directory from localStorage.
 * @returns {Promise<void>} A promise that resolves when the directory has been cleared.
 */
export async function clearDirectory(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DIRECTORY_STORAGE_KEY);
}
