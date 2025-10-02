import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { Editor } from '@tiptap/core';

// Usamos la API de servicios refactorizada
import * as directoryService from '$lib/services/core/directoryService';
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

// --- EXPORTACIÓN PRINCIPAL DEL STORE ---
export const documentStore = {
  subscribe,
  loadDocument,
  createNewDocument,
  clearInitialContent,
  updateActiveDocumentMetadata,
};
