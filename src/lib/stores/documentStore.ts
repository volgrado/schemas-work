// src/lib/stores/documentStore.ts (Versión Final Sincronizada)

import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import { editorStore } from '$lib/stores/editorStore'; // Importamos el editorStore

// Importamos los servicios
import * as directoryService from '$lib/services/core/directoryService';
import { directoryEvents } from '$lib/services/core/directoryService';
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
    // *** INICIO DE LA SOLUCIÓN ***
    // 1. Creamos una promesa que representa un tiempo de espera mínimo.
    const MIN_LOADING_TIME = 300; // 300ms
    const minDelay = new Promise((resolve) =>
      setTimeout(resolve, MIN_LOADING_TIME)
    );

    // 2. Creamos una promesa para la carga real de los datos.
    const loadData = async () => {
      const metadata = await directoryService.getItemById(docId);
      if (!metadata || metadata.type !== 'schema') {
        throw new Error(`Item is not a valid document: ${docId}`);
      }
      const { ydoc, provider } = getDocumentProvider(docId);
      await provider.whenSynced;
      return { metadata, ydoc, provider };
    };

    // 3. Esperamos a que tanto la carga como el tiempo mínimo se completen.
    const [loadedData] = await Promise.all([loadData(), minDelay]);
    const { metadata, ydoc, provider } = loadedData;
    // *** FIN DE LA SOLUCIÓN ***

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
  title: string = 'New Schema',
  content?: object,
  parentId: string | null = null
) {
  cleanup();
  update((state) => ({ ...state, status: 'loading' }));

  try {
    const newMetadata = await directoryService.createSchema(title, parentId);
    const { ydoc, provider } = getDocumentProvider(newMetadata.id);
    await provider.whenSynced;

    // --- ✨ MEJORA: CREACIÓN CON TÍTULO ---
    // Si no se proporciona contenido personalizado, creamos un contenido
    // por defecto que incluye el título como H1.
    let finalInitialContent = content;
    if (!content) {
      finalInitialContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: title }],
          },
        ],
      };
    }

    set({
      docId: newMetadata.id,
      metadata: newMetadata,
      ydoc,
      provider,
      status: 'ready',
      initialContent: finalInitialContent,
    });

    await directoryService.setLastActiveDocId(newMetadata.id);
    // Devolvemos los metadatos para que la UI pueda actuar sobre el nuevo documento si es necesario
    return newMetadata;
  } catch (error) {
    errorService.reportError(error, {
      operation: 'createNewDocument',
      title: title,
      parentId: parentId,
    });
    set({ ...initialState, status: 'error' });
    // relanzamos el error para que la UI pueda capturarlo
    throw error;
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

async function updateTitle(newTitle: string) {
  const currentState = get(_documentStore);
  const { docId, metadata: currentMetadata } = currentState;
  if (!docId || !currentMetadata) return;
  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle || trimmedTitle === currentMetadata.title) return;
  const oldMetadata = { ...currentMetadata };
  const optimisticMetadata = { ...currentMetadata, title: trimmedTitle };
  update((state) => ({ ...state, metadata: optimisticMetadata }));
  try {
    await directoryService.updateItemMetadata(docId, { title: trimmedTitle });
  } catch (error) {
    errorService.reportError(error, { operation: 'documentStore.updateTitle' });
    update((state) => ({ ...state, metadata: oldMetadata }));
  }
}

// --- ✨ MEJORA: SINCRONIZACIÓN BIDIRECCIONAL ---
directoryEvents.subscribe((event) => {
  if (!event) return;

  const currentState = get(_documentStore);
  if (!currentState.docId) return;

  // Si el documento activo fue actualizado externamente (ej. renombrado en otra pestaña)
  if (event.type === 'updated' && event.item.id === currentState.docId) {
    const editor = get(editorStore).instance;
    const currentMetadata = currentState.metadata;

    // Sincronizamos el H1 del editor si el título de los metadatos cambió
    if (
      editor &&
      currentMetadata &&
      event.item.title !== currentMetadata.title
    ) {
      // Actualizamos los metadatos en nuestro store
      update((state) => ({ ...state, metadata: event.item }));

      // Ahora, actualizamos el contenido del editor
      const { doc } = editor.state;
      const firstNode = doc.firstChild;

      if (
        firstNode &&
        firstNode.type.name === 'heading' &&
        firstNode.attrs.level === 1
      ) {
        if (firstNode.textContent !== event.item.title) {
          const from = 1; // Posición después de la etiqueta de apertura del H1
          const to = from + firstNode.content.size;

          // Usamos una transacción para reemplazar solo el texto del título
          editor
            .chain()
            .setTextSelection({ from, to })
            .insertContent(event.item.title)
            .run();
        }
      } else {
        // Si no hay un H1, lo insertamos al principio del documento
        editor
          .chain()
          .focus()
          .insertContentAt(0, {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: event.item.title }],
          })
          .run();
      }
    }
  }

  // Si el documento activo fue eliminado
  if (event.type === 'deleted' && event.item.id === currentState.docId) {
    const findAndLoadReplacementDoc = async () => {
      const allSchemas = (await directoryService.getAllItems()).filter(
        (i) => i.type === 'schema'
      );
      if (allSchemas.length > 0) {
        await loadDocument(allSchemas[0].id);
      } else {
        await createNewDocument('Mi Primer Esquema');
      }
    };
    findAndLoadReplacementDoc();
  }
});

export const documentStore = {
  subscribe,
  loadDocument,
  createNewDocument,
  clearInitialContent,
  updateTitle,
};
