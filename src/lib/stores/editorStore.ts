// src/lib/stores/editorStore.ts

import { writable } from 'svelte/store';
import type { Editor } from '@tiptap/core';

/**
 * Define la estructura del estado que este store gestionará.
 * Sirve como un punto de acceso global a la instancia del editor
 * y a la información contextual relevante, como el nodo seleccionado.
 */
export interface EditorStoreState {
  /** La instancia activa del editor Tiptap. Será `null` si el editor no ha sido montado. */
  instance: Editor | null;
  /** La posición de inicio del nodo `listItem` actualmente seleccionado. `null` si no hay selección. */
  selectedNodePos: number | null;
  contentVersion: number;
}

/**
 * El estado inicial del store. El editor no existe al principio,
 * y no hay ningún nodo seleccionado.
 */
const initialState: EditorStoreState = {
  instance: null,
  selectedNodePos: null,
  contentVersion: 0,
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
