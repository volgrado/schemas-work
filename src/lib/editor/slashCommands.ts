import type { Editor, Range } from '@tiptap/core';
import type { IconName } from '$lib/types/iconName';

// Definimos la estructura de cada ítem del menú
export interface CommandItem {
  title: string;
  icon: IconName;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

// Creamos la lista de comandos disponibles
// Es fácil añadir más en el futuro, solo sigue este patrón.
export const getCommands = (): CommandItem[] => [
  {
    title: 'Texto',
    icon: 'pen-tool', // Asegúrate de que este icono exista en tu componente Icon.svelte
    command: ({ editor, range }) => {
      // Borra el "/" y aplica el formato de párrafo normal
      editor.chain().focus().deleteRange(range).setNode('paragraph').run();
    },
  },
  {
    title: 'Título 2',
    icon: 'type',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run();
    },
  },
  {
    title: 'Lista',
    icon: 'list',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
];
