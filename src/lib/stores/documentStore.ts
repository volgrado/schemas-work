// src/lib/stores/documentStore.ts

import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';

// Importamos los servicios que este store orquestará.
import * as directoryService from '$lib/services/core/directoryService';
import { getDocumentProvider } from '$lib/services/core/persistenceService';

/**
 * Define la forma completa del estado que representa el documento actualmente activo.
 */
export interface DocumentStoreState {
  docId: string | null;
  metadata: SchemaMetadata | null;
  ydoc: Y.Doc | null;
  provider: IndexeddbPersistence | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  initialContent?: object;
}

/**
 * El estado inicial del store.
 */
const initialState: DocumentStoreState = {
  docId: null,
  metadata: null,
  ydoc: null,
  provider: null,
  status: 'idle',
  initialContent: undefined,
};

// --- *** CORRECCIÓN DE IMPLEMENTACIÓN DEL CUSTOM STORE *** ---

// 1. Creamos la instancia del store `writable`.
const _documentStore: Writable<DocumentStoreState> = writable(initialState);

// 2. Extraemos los métodos que necesitamos.
const { subscribe, update, set } = _documentStore;

/**
 * Función interna para limpiar el estado actual y destruir las conexiones
 * de persistencia.
 */
function cleanup() {
  // Ahora `get` se usa sobre la instancia correcta del store.
  const currentState = get(_documentStore);

  if (currentState.provider) {
    currentState.provider.destroy();
  }
  set(initialState);
}

/**
 * Carga un documento existente en el store.
 * @param {string} docId - El ID del documento a cargar.
 */
async function loadDocument(docId: string) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    const metadata = await directoryService.getSchemaById(docId);
    if (!metadata) {
      throw new Error(`No se encontró el documento con id: ${docId}`);
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
    console.error('Error al cargar el documento:', error);
    set({ ...initialState, status: 'error' });
  }
}

/**
 * Crea un nuevo documento, lo persiste y lo carga en el store.
 * @param {string} [title='Nuevo Esquema'] - El título para el nuevo documento.
 * @param {object} [content] - Contenido opcional en formato JSON de Tiptap.
 */
async function createNewDocument(
  title: string = 'Nuevo Esquema',
  content?: object
) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    const newMetadata = await directoryService.createSchema(title);
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
    console.error('Error al crear un nuevo documento:', error);
    set({ ...initialState, status: 'error' });
  }
}

/**
 * Limpia la propiedad `initialContent` del estado.
 */
function clearInitialContent() {
  update((state) => {
    if (state.initialContent) {
      return { ...state, initialContent: undefined };
    }
    return state;
  });
}

// 3. Exportamos el objeto del custom store con la API pública.
export const documentStore = {
  subscribe,
  loadDocument,
  createNewDocument,
  clearInitialContent,
};
