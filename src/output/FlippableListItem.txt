// src/lib/editor/extensions/FlippableListItem.ts

import ListItem from '@tiptap/extension-list-item';
import type { DomainCard } from '$lib/types';
import type { ChainedCommands, Editor } from '@tiptap/core';

// Extendemos los tipos de Tiptap para que TypeScript conozca nuestro
// nuevo comando `setCards`. Esto proporciona autocompletado y seguridad de tipos.
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    // Añadimos nuestro comando al tipo `listItem`.
    listItem: {
      /**
       * Comando personalizado para establecer o actualizar el array de tarjetas
       * de estudio en el nodo `listItem` actualmente seleccionado.
       * @param cards El nuevo array de tarjetas a guardar.
       */
      setCards: (cards: DomainCard[]) => ReturnType;
    };
  }
}

/**
 * Extiende la funcionalidad del `ListItem` nativo de Tiptap.
 *
 * Su principal responsabilidad es añadir un atributo `cards` a cada elemento
 * de la lista, permitiendo almacenar datos estructurados (preguntas y respuestas)
 * directamente en el esquema del documento.
 */
export const FlippableListItem = ListItem.extend({
  // Mantenemos el nombre 'listItem' para sobrescribir el comportamiento por defecto.
  name: 'listItem',

  /**
   * El hook `addAttributes` nos permite definir datos adicionales que se
   * almacenarán en este tipo de nodo.
   */
  addAttributes() {
    return {
      // El atributo `cards` almacenará un array de objetos DomainCard.
      cards: {
        // Por defecto, un nuevo `listItem` tendrá un array vacío de tarjetas.
        default: [],

        // `parseHTML` define cómo leer este atributo desde el DOM.
        // Tiptap lo usará si, por ejemplo, pegas HTML en el editor.
        parseHTML: (element: HTMLElement) => {
          const rawCards = element.getAttribute('data-cards');
          if (!rawCards) {
            return [];
          }
          try {
            // Parseamos el string JSON de vuelta a un objeto.
            return JSON.parse(rawCards);
          } catch (e) {
            console.error('Error al parsear el atributo data-cards:', e);
            return [];
          }
        },

        // `renderHTML` define cómo escribir este atributo en el DOM.
        // Tiptap lo usará al exportar el contenido a HTML.
        renderHTML: (attributes: { cards?: DomainCard[] }) => {
          if (!attributes.cards || attributes.cards.length === 0) {
            return {}; // No añade el atributo si no hay tarjetas.
          }
          return {
            'data-cards': JSON.stringify(attributes.cards),
          };
        },
      },
    };
  },

  /**
   * El hook `addCommands` nos permite exponer nuevas acciones que pueden
   * ser encadenadas y ejecutadas en la instancia del editor.
   */
  addCommands() {
    return {
      // Definimos nuestro comando `setCards`.
      setCards:
        (cards: DomainCard[]) =>
        ({ commands }: { commands: ChainedCommands; editor: Editor }) => {
          // Usamos el comando nativo `updateAttributes` para modificar
          // el atributo 'cards' del nodo 'listItem' seleccionado.
          return commands.updateAttributes('listItem', { cards: cards });
        },
    };
  },
});
