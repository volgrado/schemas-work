// src/lib/stores/documentStore.ts

import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { Editor } from '@tiptap/core'; // <--- Importante para la nueva función

// Usamos la API de servicios refactorizada
import * as directoryService from '$lib/services/core/directoryService';
import { getDocumentProvider } from '$lib/services/core/persistenceService';
import * as errorService from '$lib/services/core/errorService';

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
  // Limpiamos también el store del árbol al cambiar de documento
  schemaTreeData.set(null);
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

// --- NUEVO CÓDIGO PARA LA SINCRONIZACIÓN DEL ÁRBOL ---

/**
 * Define la estructura de un nodo para el componente SchemaTree.
 */
export interface TreeNodeData {
  id: string;
  content: string;
  children: TreeNodeData[];
}

/**
 * Función recursiva para convertir una lista de Tiptap a un array de TreeNodes.
 */
function convertTiptapToTree(node: any): TreeNodeData[] {
  if (!node || !node.content) {
    return [];
  }

  const results: TreeNodeData[] = [];

  for (const childNode of node.content) {
    if (childNode.type === 'bulletList') {
      results.push(...convertTiptapToTree(childNode));
    } else if (childNode.type === 'listItem') {
      const mainContent = childNode.content?.find(
        (c: any) => c.type === 'paragraph'
      );
      const text = mainContent?.content?.map((t: any) => t.text).join('') || '';
      const nestedList = childNode.content?.find(
        (c: any) => c.type === 'bulletList'
      );

      results.push({
        // IMPORTANTE: Tus nodos 'listItem' de Tiptap deben tener un atributo 'id' único.
        id: childNode.attrs?.id || `random_id_${Math.random()}`,
        content: text,
        children: nestedList ? convertTiptapToTree(nestedList) : [],
      });
    }
  }
  return results;
}

/**
 * Función principal que convierte el JSON de un documento Tiptap completo a una estructura de árbol.
 */
function generateTreeFromJSON(docJSON: any): TreeNodeData | null {
  const titleNode = docJSON.content?.find(
    (n: any) => n.type === 'heading' && n.attrs.level === 1
  );
  const rootList = docJSON.content?.find((n: any) => n.type === 'bulletList');

  // Si no hay título, no podemos construir el árbol.
  if (!titleNode) {
    return null;
  }

  return {
    id: 'root', // El nodo raíz siempre tiene el mismo ID
    content:
      titleNode.content?.map((t: any) => t.text).join('') ||
      'Esquema sin título',
    children: rootList ? convertTiptapToTree(rootList) : [],
  };
}

/**
 * El nuevo store reactivo que contendrá los datos para el componente SchemaTree.
 */
export const schemaTreeData = writable<TreeNodeData | null>(null);

/**
 * La función "puente". Toma una instancia del editor, extrae su JSON, lo convierte
 * y actualiza el store `schemaTreeData`.
 */
export function syncTreeWithDocument(editor: Editor) {
  if (!editor || editor.isDestroyed) return;

  const docJSON = editor.getJSON();
  const newTreeData = generateTreeFromJSON(docJSON);

  // Al hacer .set(), cualquier componente suscrito a `schemaTreeData` se actualizará.
  schemaTreeData.set(newTreeData);
}

// --- FIN DEL NUEVO CÓDIGO ---

// EXPORTACIÓN PRINCIPAL DEL STORE
export const documentStore = {
  subscribe,
  loadDocument,
  createNewDocument,
  clearInitialContent,
  updateActiveDocumentMetadata,
};
