// src/lib/services/core/directoryService.ts

import { v4 as uuidv4 } from 'uuid';
import type { SchemaMetadata } from '$lib/types';

const DIRECTORY_STORAGE_KEY = 'schemas-work-directory';
const LAST_ACTIVE_DOC_KEY = 'schemas-work-last-active';

/**
 * Obtiene la lista completa de todos los ítems (esquemas y carpetas).
 * Es la fuente de verdad para todas las demás funciones de listado.
 * @returns {Promise<SchemaMetadata[]>} Una promesa que se resuelve con el array completo de metadatos.
 */
export async function getAllItems(): Promise<SchemaMetadata[]> {
  if (typeof window === 'undefined') return [];
  const storedDirectory = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  return storedDirectory ? JSON.parse(storedDirectory) : [];
}

/**
 * Obtiene los ítems que son hijos directos de un padre específico.
 * @param {string | null} parentId - El ID de la carpeta padre. `null` para la raíz.
 * @returns {Promise<SchemaMetadata[]>} La lista de ítems en esa ubicación.
 */
export async function listItemsByParentId(
  parentId: string | null
): Promise<SchemaMetadata[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.parentId === parentId);
}

/**
 * Obtiene los metadatos de un ítem específico por su ID.
 * @param {string} id - El ID del ítem a buscar.
 * @returns {Promise<SchemaMetadata | undefined>}
 */
export async function getItemById(
  id: string
): Promise<SchemaMetadata | undefined> {
  const allItems = await getAllItems();
  return allItems.find((item) => item.id === id);
}

/**
 * Crea los metadatos para un nuevo esquema en una ubicación específica.
 * @param {string} title - El título inicial.
 * @param {string | null} parentId - El ID de la carpeta padre, o `null` para la raíz.
 */
export async function createSchema(
  title: string,
  parentId: string | null = null
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
 * Crea los metadatos para una nueva carpeta en una ubicación específica.
 * @param {string} title - El título de la carpeta.
 * @param {string | null} parentId - El ID de la carpeta padre, o `null` para la raíz.
 */
export async function createFolder(
  title: string,
  parentId: string | null = null
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
 * Actualiza los metadatos de un ítem existente.
 * @param {string} id - El ID del ítem a actualizar.
 * @param {Partial<Omit<SchemaMetadata, 'id'>>} updates - Un objeto con los campos a actualizar.
 */
export async function updateItemMetadata(
  id: string,
  updates: Partial<Omit<SchemaMetadata, 'id'>>
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const itemIndex = allItems.findIndex((s) => s.id === id);

  if (itemIndex === -1) {
    throw new Error(`No se encontró el ítem con id: ${id}`);
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
 * Elimina un ítem (esquema o carpeta). Si es una carpeta, elimina todo su contenido recursivamente.
 * @param {string} itemId - El ID del ítem a eliminar.
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
        new Promise((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () =>
            reject(
              new Error(`La eliminación de la BD '${id}' está bloqueada.`)
            );
        })
      );
    }
  }

  const updatedItems = allItems.filter(
    (item) => !itemsToDeleteIds.has(item.id)
  );
  await saveDirectory(updatedItems);

  await Promise.all(dbDeletionPromises);
}

// --- Funciones de utilidad ---

export async function getLastActiveDocId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ACTIVE_DOC_KEY);
}

export async function setLastActiveDocId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVE_DOC_KEY, id);
}

/**
 * Guarda un directorio completo de metadatos en localStorage.
 * Esta es una operación de bajo nivel, usada principalmente por la función de importación.
 * @param {SchemaMetadata[]} items - El array completo de metadatos a guardar.
 */
export async function saveDirectory(items: SchemaMetadata[]): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Limpia por completo el directorio de metadatos de localStorage.
 */
export async function clearDirectory(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DIRECTORY_STORAGE_KEY);
}
