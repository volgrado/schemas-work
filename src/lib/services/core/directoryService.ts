// src/lib/services/core/directoryService.ts (Versión Final y Robusta)

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
          description: 'Failed to parse data from storage event.',
        });
      }
    }
  });
}

// ========================================================================
// OPERACIONES CRUD Y DE GESTIÓN
// ========================================================================

export async function getAllItems(): Promise<SchemaMetadata[]> {
  if (typeof window === 'undefined') return [];
  const storedDirectory = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  try {
    return storedDirectory ? JSON.parse(storedDirectory) : [];
  } catch (error) {
    errorService.reportError(error, { operation: 'getAllItems' });
    return [];
  }
}

export async function listItemsByParentId(
  parentId: string | null
): Promise<SchemaMetadata[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.parentId === parentId);
}

export async function getItemById(
  id: string
): Promise<SchemaMetadata | undefined> {
  const allItems = await getAllItems();
  return allItems.find((item) => item.id === id);
}

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
    throw new Error(`Ya existe un ítem llamado "${title}" en esta ubicación.`);
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
      `Ya existe una carpeta llamada "${title}" en esta ubicación.`
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
        `Ya existe un ítem llamado "${newTitle}" en esta ubicación.`
      );
    }
  }

  const updatedItem = { ...originalItem, ...updates, updatedAt: Date.now() };
  allItems[itemIndex] = updatedItem;
  await saveDirectory(allItems);
  return updatedItem;
}

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
        if (child.type === 'folder') findChildrenRecursive(child.id);
      }
    };
    findChildrenRecursive(itemId);
  }

  const dbDeletionPromises: Promise<void>[] = [];
  itemsToDeleteIds.forEach((id) => {
    const item = allItems.find((i) => i.id === id);
    if (item?.type === 'schema') {
      dbDeletionPromises.push(
        new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(id);
          request.onsuccess = () => resolve();
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
      throw new Error('No se puede mover una carpeta dentro de sí misma.');
    }
    let currentParentId = newParentId;
    while (currentParentId !== null) {
      if (currentParentId === itemId) {
        throw new Error(
          'No se puede mover una carpeta a una de sus propias subcarpetas.'
        );
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

export async function getLastActiveDocId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ACTIVE_DOC_KEY);
}

export async function setLastActiveDocId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVE_DOC_KEY, id);
}

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

export async function clearDirectory(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DIRECTORY_STORAGE_KEY);
}
