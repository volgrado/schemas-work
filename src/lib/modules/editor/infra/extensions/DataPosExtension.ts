import { Extension } from '@tiptap/core';

export const DataPosExtension = Extension.create({
  name: 'dataPos',

  addGlobalAttributes() {
    return [
      {
        types: [
          'heading',
          'paragraph',
          'bulletList',
          'orderedList',
          'listItem',
          'blockquote',
          'codeBlock',
        ],
        attributes: {
          dataPos: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-pos'),
            renderHTML: (attributes) => {
              if (attributes.dataPos) {
                return { 'data-pos': attributes.dataPos };
              }
              return {};
            },
          },
        },
      },
    ];
  },
});
