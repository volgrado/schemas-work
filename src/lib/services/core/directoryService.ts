// src/lib/services/core/directoryService.ts

import { v4 as uuidv4 } from 'uuid';
import type { SchemaMetadata } from '$lib/types';
import * as errorService from '$lib/services/core/errorService';

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

  // *** NUEVO: Bloque try...catch para el parseo ***
  try {
    return storedDirectory ? JSON.parse(storedDirectory) : [];
  } catch (error) {
    errorService.reportError(error, {
      operation: 'getAllItems',
      description:
        'Failed to parse directory from localStorage. Data might be corrupt.',
    });
    // Devuelve un estado seguro (array vacío) para evitar que la aplicación se bloquee.
    return [];
  }
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
    // *** NUEVO: Reportar error si el ítem no se encuentra ***
    const error = new Error(`Item not found for update: ${id}`);
    errorService.reportError(error, {
      operation: 'updateItemMetadata',
      itemId: id,
      updates: updates,
    });
    throw error; // Relanzamos el error para que el llamador sepa que la operación falló.
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
        new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(id);
          request.onsuccess = () => resolve();
          // *** NUEVO: Reportar error en onerror y onblocked ***
          request.onerror = (event) => {
            errorService.reportError(request.error || event, {
              operation: 'deleteItem.indexedDB.deleteDatabase',
              itemId: id,
            });
            reject(request.error || event);
          };
          request.onblocked = (event) => {
            const error = new Error(
              `Database deletion blocked for item ID: ${id}`
            );
            errorService.reportError(error, {
              operation: 'deleteItem.indexedDB.onblocked',
              itemId: id,
            });
            reject(error);
          };
        })
      );
    }
  }

  const updatedItems = allItems.filter(
    (item) => !itemsToDeleteIds.has(item.id)
  );
  await saveDirectory(updatedItems);

  // *** NUEVO: Envolver Promise.all en un try...catch para capturar fallos de borrado de DB ***
  try {
    await Promise.all(dbDeletionPromises);
  } catch (error) {
    // El error ya se reportó dentro de la promesa, aquí solo lo relanzamos
    // para que el llamador (CommandBar) sepa que algo falló.
    // El toast.error del CommandBar se encargará del feedback al usuario.
    throw error;
  }
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
