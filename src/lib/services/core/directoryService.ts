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
 * Razonamiento: Para lograr una arquitectura reactiva y desacoplada, necesitamos un
 * canal de comunicación para notificar a la aplicación cuando el directorio cambia.
 * Un store de Svelte (`writable`) es perfecto para esto. Otros módulos (como `documentStore`
 * o `FileExplorer`) pueden suscribirse a este store para reaccionar a los cambios
 * sin estar directamente acoplados a este servicio.
 */
export const directoryEvents = writable<{
  type: 'created' | 'updated' | 'deleted';
  item: SchemaMetadata; // Enviamos el ítem completo para dar contexto al suscriptor.
} | null>(null);

/**
 * Razonamiento: `localStorage` no notifica a la pestaña que origina un cambio. Para
 * unificar la lógica y asegurar que tanto la pestaña activa como las pestañas en
 * segundo plano reaccionen de la misma manera, centralizamos TODA la emisión de eventos
 * en el listener del evento `storage`. Este listener se convierte en la única fuente
 * de verdad para los eventos del directorio. Disparamos manualmente este evento en
 * `saveDirectory` para "engañar" a la pestaña activa y hacerla pasar por este mismo flujo.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // Solo reaccionamos a los cambios en nuestra clave específica.
    if (event.key === DIRECTORY_STORAGE_KEY) {
      console.log('[directoryService] Evento de storage procesado.');

      // Parseamos el estado anterior y el nuevo para compararlos.
      try {
        const oldItems: SchemaMetadata[] = event.oldValue
          ? JSON.parse(event.oldValue)
          : [];
        const newItems: SchemaMetadata[] = event.newValue
          ? JSON.parse(event.newValue)
          : [];

        const oldIds = new Set(oldItems.map((i) => i.id));
        const newIds = new Set(newItems.map((i) => i.id));

        // Lógica de "diffing" (comparación) para determinar qué ha cambiado:

        // 1. Detectar creaciones y actualizaciones
        for (const newItem of newItems) {
          const oldItem = oldItems.find((i) => i.id === newItem.id);
          if (!oldItem) {
            // Si el ítem no existía antes, es una CREACIÓN.
            directoryEvents.set({ type: 'created', item: newItem });
          } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            // Si existía pero su contenido ha cambiado, es una ACTUALIZACIÓN.
            directoryEvents.set({ type: 'updated', item: newItem });
          }
        }

        // 2. Detectar eliminaciones
        for (const oldItem of oldItems) {
          if (!newIds.has(oldItem.id)) {
            // Si un ítem existía antes pero ya no, es una ELIMINACIÓN.
            directoryEvents.set({ type: 'deleted', item: oldItem });
          }
        }
      } catch (error) {
        errorService.reportError(error, {
          operation: 'storageEventListener',
          description:
            'Fallo al parsear datos antiguos/nuevos del evento de storage.',
        });
      }
    }
  });
}

// ========================================================================
// API PÚBLICA DEL SERVICIO
// ========================================================================

/**
 * Obtiene la lista completa de todos los ítems. Es la base para las demás funciones.
 * Incluye manejo de errores por si los datos en localStorage están corruptos.
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
        'Fallo al parsear el directorio desde localStorage. Datos corruptos.',
    });
    return []; // Devolver un estado seguro.
  }
}

/**
 * Obtiene los ítems que son hijos directos de un padre específico.
 */
export async function listItemsByParentId(
  parentId: string | null
): Promise<SchemaMetadata[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.parentId === parentId);
}

/**
 * Obtiene los metadatos de un ítem específico por su ID.
 */
export async function getItemById(
  id: string
): Promise<SchemaMetadata | undefined> {
  const allItems = await getAllItems();
  return allItems.find((item) => item.id === id);
}

/**
 * Crea los metadatos para un nuevo esquema y persiste el cambio.
 * Delega la notificación del evento a `saveDirectory`.
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
 * Crea los metadatos para una nueva carpeta y persiste el cambio.
 * Delega la notificación del evento a `saveDirectory`.
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
 * Actualiza los metadatos de un ítem existente y persiste el cambio.
 * Delega la notificación del evento a `saveDirectory`.
 */
export async function updateItemMetadata(
  id: string,
  updates: Partial<Omit<SchemaMetadata, 'id'>>
): Promise<SchemaMetadata> {
  const allItems = await getAllItems();
  const itemIndex = allItems.findIndex((s) => s.id === id);

  if (itemIndex === -1) {
    const error = new Error(`Ítem no encontrado para actualizar: ${id}`);
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
 * Elimina un ítem (y sus hijos si es una carpeta) y persiste el cambio.
 * Delega la notificación del evento a `saveDirectory`.
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

  try {
    await Promise.all(dbDeletionPromises);
  } catch (error) {
    throw error;
  }
}

// ========================================================================
// FUNCIONES DE UTILIDAD Y BAJO NIVEL
// ========================================================================

/**
 * Obtiene el ID del último documento activo desde localStorage.
 */
export async function getLastActiveDocId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ACTIVE_DOC_KEY);
}

/**
 * Guarda el ID del último documento activo en localStorage.
 */
export async function setLastActiveDocId(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVE_DOC_KEY, id);
}

/**
 * Guarda un directorio completo en localStorage y notifica a TODAS las pestañas
 * (incluida la actual) sobre el cambio disparando un evento `storage`.
 * Esta es ahora la ÚNICA función que interactúa directamente con localStorage para escritura.
 *
 * Razonamiento: Al centralizar la escritura y la notificación en esta función de bajo nivel,
 * nos aseguramos de que cada cambio, sin importar su origen, active el flujo reactivo
 * de manera consistente. Esto elimina la necesidad de emitir eventos manualmente en cada
 * función de alto nivel (create, update, delete), simplificando el código y reduciendo errores.
 */
export async function saveDirectory(items: SchemaMetadata[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const oldValue = localStorage.getItem(DIRECTORY_STORAGE_KEY);
  const newValue = JSON.stringify(items);

  // Evitamos disparar eventos si nada ha cambiado realmente.
  if (oldValue === newValue) return;

  localStorage.setItem(DIRECTORY_STORAGE_KEY, newValue);

  // Disparamos el evento `storage` manualmente. El navegador solo hace esto
  // para otras pestañas, pero al hacerlo nosotros, forzamos que el listener
  // de esta misma pestaña también se active, unificando el flujo de eventos.
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: DIRECTORY_STORAGE_KEY,
      oldValue: oldValue,
      newValue: newValue,
    })
  );
}

/**
 * Limpia por completo el directorio de metadatos de localStorage.
 */
export async function clearDirectory(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DIRECTORY_STORAGE_KEY);
}
