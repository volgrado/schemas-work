// src/lib/editor/extensions/RoleExtension.ts
import { Extension } from '@tiptap/core';

// Esta extensión añade un atributo 'role' a los párrafos.
export const RoleExtension = Extension.create({
  name: 'role',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          role: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-role'),
            renderHTML: (attributes) => {
              if (!attributes.role) {
                return {};
              }
              return { 'data-role': attributes.role };
            },
          },
        },
      },
    ];
  },
});
