// src/lib/stores/documentStore.ts

import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';

// Usamos la API de servicios refactorizada
import * as directoryService from '$lib/services/core/directoryService';
import { getDocumentProvider } from '$lib/services/core/persistenceService';

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

function cleanup() {
  const currentState = get(_documentStore);
  if (currentState.provider) {
    currentState.provider.destroy();
  }
  set(initialState);
}

async function loadDocument(docId: string) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    // *** CAMBIO: Usamos la nueva función `getItemById` ***
    const metadata = await directoryService.getItemById(docId);

    // Añadimos una verificación para asegurarnos de que no intentamos abrir una carpeta
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
    console.error('Error al cargar el documento:', error);
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
    console.error('Error al crear un nuevo documento:', error);
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

function updateActiveDocumentMetadata(
  metadataUpdates: Partial<SchemaMetadata>
) {
  update((state) => {
    if (state.metadata) {
      return {
        ...state,
        metadata: { ...state.metadata, ...metadataUpdates },
      };
    }
    return state;
  });
}

export const documentStore = {
  subscribe,
  loadDocument,
  createNewDocument,
  clearInitialContent,
  updateActiveDocumentMetadata,
};
