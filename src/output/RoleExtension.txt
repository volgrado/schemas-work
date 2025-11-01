/**
 * @file Implements the `RoleExtension` for the Tiptap editor. This extension is responsible
 * for assigning a `role` attribute to paragraph nodes.
 */

import { Extension } from '@tiptap/core';

/**
 * @description The `RoleExtension` adds a `role` attribute to `paragraph` nodes.
 *
 * In the context of this application, paragraphs within a `listItem` are assigned roles
 * such as 'term' or 'definition'. This semantic information is crucial for features like
 * creating study cards, where the distinction between a term and its definition is essential.
 *
 * The role is persisted to the HTML as a `data-role` attribute.
 */
export const RoleExtension = Extension.create({
  name: 'role',

  /**
   * Adds the `role` attribute to all `paragraph` nodes.
   */
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          role: {
            default: null,
            // Defines how the attribute is read from and written to the HTML.
            parseHTML: (element) => element.getAttribute('data-role'),
            renderHTML: (attributes) => {
              if (!attributes.role) {
                return {};
              }
              // Persist the role to the DOM as a `data-role` attribute.
              return { 'data-role': attributes.role };
            },
          },
        },
      },
    ];
  },
});
