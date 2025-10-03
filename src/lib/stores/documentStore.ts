import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { Editor } from '@tiptap/core';

// Usamos la API de servicios refactorizada
import * as directoryService from '$lib/services/core/directoryService';
import { directoryEvents } from '$lib/services/core/directoryService';

import { getDocumentProvider } from '$lib/services/core/persistenceService';
import * as errorService from '$lib/services/core/errorService';
// ✅ NUEVO: Importamos el servicio centralizado que contiene la lógica de negocio
import * as schemaService from '$lib/services/features/schemaService';

import type { TreeNodeData } from '$lib/types/tree';

export interface DocumentStoreState {
  docId: string | null;
  metadata: SchemaMetadata | null;
  ydoc: Y.Doc | null;
  provider: IndexeddbPersistence | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  initialContent?: object;
}

const initialState: DocumentStoreState = {
  docId: null,
  metadata: null,
  ydoc: null,
  provider: null,
  status: 'idle',
  initialContent: undefined,
};

const _documentStore: Writable<DocumentStoreState> = writable(initialState);
const { subscribe, update, set } = _documentStore;

// --- FUNCIONES EXISTENTES (sin cambios) ---

function cleanup() {
  const currentState = get(_documentStore);
  if (currentState.provider) {
    currentState.provider.destroy();
  }
  schemaTreeData.set(null); // Limpiamos el árbol al cambiar de documento
  set(initialState);
}

async function loadDocument(docId: string) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    const metadata = await directoryService.getItemById(docId);
    if (!metadata || metadata.type !== 'schema') {
      throw new Error(`Ítem no es un documento válido: ${docId}`);
    }

    const { ydoc, provider } = getDocumentProvider(docId);
    await provider.whenSynced;

    set({
      docId,
      metadata,
      ydoc,
      provider,
      status: 'ready',
      initialContent: undefined,
    });

    await directoryService.setLastActiveDocId(docId);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'loadDocument',
      docId: docId,
    });
    set({ ...initialState, status: 'error' });
  }
}

async function createNewDocument(
  title: string = 'Nuevo Esquema',
  content?: object,
  parentId: string | null = null
) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    const newMetadata = await directoryService.createSchema(title, parentId);
    const { ydoc, provider } = getDocumentProvider(newMetadata.id);
    await provider.whenSynced;

    set({
      docId: newMetadata.id,
      metadata: newMetadata,
      ydoc,
      provider,
      status: 'ready',
      initialContent: content,
    });

    await directoryService.setLastActiveDocId(newMetadata.id);
  } catch (error) {
    errorService.reportError(error, {
      operation: 'createNewDocument',
      title: title,
      parentId: parentId,
    });
    set({ ...initialState, status: 'error' });
  }
}

function clearInitialContent() {
  update((state) => {
    if (state.initialContent) {
      return { ...state, initialContent: undefined };
    }
    return state;
  });
}

/**
 * ✅ NUEVO: Actualiza el título del documento activo, persistiendo el cambio
 * a través del directoryService y actualizando el estado local del store.
 * Utiliza un enfoque optimista para una experiencia de usuario fluida.
 *
 * @param newTitle El nuevo título para el documento.
 */
async function updateTitle(newTitle: string) {
  const currentState = get(_documentStore);
  const { docId, metadata: currentMetadata } = currentState;

  if (!docId || !currentMetadata) {
    errorService.reportError(
      new Error('Intento de actualizar título sin documento cargado.'),
      {
        operation: 'documentStore.updateTitle',
        description: 'Pre-condition failed: docId or metadata is null.',
      }
    );
    return;
  }

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || trimmedTitle === currentMetadata.title) {
    return; // No hacer nada si el título está vacío o no ha cambiado
  }

  const oldMetadata = { ...currentMetadata };
  const optimisticMetadata = { ...currentMetadata, title: trimmedTitle };

  // 1. Actualización Optimista: La UI se actualiza inmediatamente.
  update((state) => ({ ...state, metadata: optimisticMetadata }));

  try {
    // 2. Persistencia: Llama a la función que YA EXISTE en tu directoryService.
    await directoryService.updateItemMetadata(docId, { title: trimmedTitle });
  } catch (error) {
    // 3. Rollback: Si el guardado falla, se revierte el cambio en la UI.
    errorService.reportError(error, {
      operation: 'documentStore.updateTitle.persistence',
      description: 'Failed to persist title update. Rolling back UI.',
      docId: docId,
    });
    update((state) => ({ ...state, metadata: oldMetadata }));
  }
}

// --- LÓGICA DE SINCRONIZACIÓN DEL ÁRBOL (REFACTORIZADA) ---

// --- LÓGICA DE CONVERSIÓN ELIMINADA ---
// Las funciones `convertTiptapToTree` y `generateTreeFromJSON` han sido borradas de este archivo.
// Toda esa lógica ahora reside de forma centralizada en `schemaService.ts`.

/**
 * El store reactivo que contendrá los datos para el componente SchemaTree.
 */
export const schemaTreeData = writable<TreeNodeData | null>(null);

/**
 * ✅ REFACTORIZADO: Esta función ahora delega la lógica de conversión al `schemaService`.
 * Su única responsabilidad es actuar como "puente" entre el editor y el store del árbol.
 */
export function syncTreeWithDocument(editor: Editor) {
  if (!editor || editor.isDestroyed) {
    schemaTreeData.set(null); // Resetea el árbol si no hay editor
    return;
  }

  // 1. Obtiene el nodo del documento del editor
  const docNode = editor.state.doc;
  // 2. Llama al servicio centralizado para hacer la conversión
  const newTreeData = schemaService.documentToTreeData(docNode);
  // 3. Actualiza el store con el resultado
  schemaTreeData.set(newTreeData);
}

/**
 * ✅ NUEVO: Suscripción reactiva a los eventos del directorio.
 * Esto mantiene el estado del documento activo sincronizado con los cambios
 * que ocurren en otras partes de la aplicación (como el FileExplorer).
 */
directoryEvents.subscribe((event) => {
  if (!event) return;

  const currentState = get(_documentStore);

  // Si no hay un documento cargado, no hay nada que hacer.
  if (!currentState.docId) return;

  // --- REACCIÓN A EVENTOS ---

  // Caso 1: El documento activo FUE ACTUALIZADO (ej. renombrado en el explorador)
  if (event.type === 'updated' && event.item.id === currentState.docId) {
    console.log(
      '[documentStore] El documento activo fue actualizado externamente. Sincronizando metadatos.'
    );
    update((state) => ({
      ...state,
      metadata: event.item, // Usamos los datos del evento, que son la nueva fuente de verdad
    }));
  }

  // Caso 2: El documento activo FUE ELIMINADO
  if (event.type === 'deleted' && event.item.id === currentState.docId) {
    console.warn(
      '[documentStore] ¡El documento activo fue eliminado! Buscando un documento de reemplazo.'
    );

    // Lógica para cargar otro documento o crear uno nuevo
    // (Esta lógica es similar a la que ya tienes en `handleDeleteItem` en FileExplorerView)
    const findAndLoadReplacementDoc = async () => {
      const allSchemas = (await directoryService.getAllItems()).filter(
        (i) => i.type === 'schema'
      );
      if (allSchemas.length > 0) {
        // Carga el primer esquema disponible
        await loadDocument(allSchemas[0].id);
      } else {
        // Si no queda ninguno, crea uno nuevo
        await createNewDocument('Mi Primer Esquema');
      }
    };

    findAndLoadReplacementDoc();
  }
});

// --- EXPORTACIÓN PRINCIPAL DEL STORE ---
export const documentStore = {
  subscribe,
  loadDocument,
  createNewDocument,
  clearInitialContent,
  updateTitle,
};
