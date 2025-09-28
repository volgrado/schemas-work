// src/lib/editor/extensions/DynamicHighlighter.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { get } from 'svelte/store';
import { reviewStore } from '$lib/stores/reviewStore';
import { ttsStore } from '$lib/stores/ttsStore';
import type { DecorationSet } from 'prosemirror-view';

// Es una buena práctica darle una clave única a los plugins de ProseMirror
// para evitar colisiones y facilitar su depuración.
export const DYNAMIC_HIGHLIGHTER_PLUGIN_KEY = new PluginKey(
  'dynamicHighlighter'
);

/**
 * Extensión de Tiptap que aplica decoraciones dinámicas (clases CSS)
 * al contenido del editor en respuesta a estados globales de la aplicación,
 * como el modo de repaso o el modo de lectura en voz alta.
 *
 * No introduce nuevos nodos o marcas, sino que enriquece visualmente
 * la experiencia del usuario de forma contextual.
 */
export const DynamicHighlighter = Extension.create({
  name: 'dynamicHighlighter',

  /**
   * `addProseMirrorPlugins` es el hook de Tiptap que nos permite inyectar
   * la lógica de bajo nivel de ProseMirror.
   *
   * Este plugin observará los stores de Svelte y devolverá el `DecorationSet`
   * apropiado para que ProseMirror lo renderice.
   */
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: DYNAMIC_HIGHLIGHTER_PLUGIN_KEY,
        props: {
          /**
           * La propiedad `decorations` es una función que ProseMirror llama
           * cada vez que el estado del editor necesita ser redibujado.
           * Debe devolver un `DecorationSet` o `null`.
           */
          decorations(): DecorationSet | null {
            const reviewState = get(reviewStore);
            const ttsState = get(ttsStore);

            // Priorizamos el estado de repaso. Si está activo, usamos sus decoraciones.
            if (reviewState.isReviewing) {
              return reviewState.decorationSet;
            }

            // Si no, comprobamos el estado de lectura.
            if (ttsState.isPlaying) {
              return ttsState.decorationSet;
            }

            // Si ningún modo está activo, no aplicamos ninguna decoración.
            return null;
          },
        },
      }),
    ];
  },
});
