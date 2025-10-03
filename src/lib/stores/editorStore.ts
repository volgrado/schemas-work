// src/lib/stores/editorStore.ts

import { writable } from 'svelte/store';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from 'prosemirror-model'; // Importamos el tipo

/**
 * Define la estructura del estado que este store gestionará.
 * Sirve como un punto de acceso global a la instancia del editor
 * y a la información contextual relevante, como el nodo seleccionado.
 */
export interface EditorStoreState {
  instance: Editor | null;
  selectedNodePos: number | null;
  contentVersion: number;
  doc: ProseMirrorNode | null; // ✅ AÑADIMOS EL NODO DEL DOCUMENTO
}

const initialState: EditorStoreState = {
  instance: null,
  selectedNodePos: null,
  contentVersion: 0,
  doc: null, // ✅ VALOR INICIAL
};

/**
 * Un store `writable` que contiene el estado global del editor.
 *
 * El componente `DocumentView` es responsable de establecer `instance`
 * cuando se monta el editor y de actualizar `selectedNodePos` cuando
 * cambia la selección del usuario.
 *
 * Otros componentes y servicios (CommandBar, reviewStore, ttsStore)
 * se suscriben a este store para leer el estado y actuar en consecuencia.
 */
export const editorStore = writable<EditorStoreState>(initialState);
