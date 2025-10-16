// src/lib/editor/slashCommands.ts
import type { Editor, Range } from '@tiptap/core';
import type { IconName } from '$lib/types/iconName';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { editorStore } from '$lib/stores/editorStore';
import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { ttsStore } from '$lib/stores/ttsStore';
import { cardEditorStore } from '$lib/stores/cardEditorStore';

export interface CommandItem {
  title: string;
  description: string;
  group: string;
  icon: IconName;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

const hasNodeSelected = () => get(editorStore).selectedNodePos !== null;

export const getCommands = (): CommandItem[] => [
  // --- Grupo: Básico ---
  {
    title: 'Término',
    description: 'Añadir un nuevo concepto o término.',
    group: 'Básico',
    icon: 'pen-tool',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBulletList()
        //.liftListItem('listItem') // This seems to be buggy with current setup, toggle works better.
        .run();
    },
  },
  {
    title: 'Lista',
    description: 'Crear una lista con viñetas.',
    group: 'Básico',
    icon: 'list',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Lista Numerada',
    description: 'Crear una lista ordenada (1, 2, 3...).',
    group: 'Básico',
    icon: 'list', // Re-using icon for now
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },

  // --- Grupo: Formato ---
  {
    title: 'Título 1',
    description: 'El título principal del esquema.',
    group: 'Formato',
    icon: 'type',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run();
    },
  },
  {
    title: 'Título 2',
    description: 'Añadir un subtítulo de sección.',
    group: 'Formato',
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
    title: 'Título 3',
    description: 'Añadir un subtítulo anidado.',
    group: 'Formato',
    icon: 'type',
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 3 })
        .run();
    },
  },
  {
    title: 'Separador',
    description: 'Añadir una línea horizontal.',
    group: 'Formato',
    icon: 'minus',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Negrita',
    description: 'Resaltar el texto seleccionado.',
    group: 'Formato',
    icon: 'bold',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setMark('bold').run();
    },
  },
  {
    title: 'Cursiva',
    description: 'Enfatizar el texto seleccionado.',
    group: 'Formato',
    icon: 'italic',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setMark('italic').run();
    },
  },

  // --- Grupo: IA ---
  {
    title: 'Expandir Nodo (IA)',
    description: 'Generar sub-puntos para el nodo actual.',
    group: 'IA',
    icon: 'sparkles',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      if (!hasNodeSelected()) {
        toast.error('Para expandir, primero selecciona un nodo en el esquema.');
        return;
      }
      commandBarStore.openAiHelper('expand-node');
    },
  },
  {
    title: 'Generar Tarjetas (IA)',
    description: 'Crear tarjetas de estudio para este nodo.',
    group: 'IA',
    icon: 'zap',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      if (!hasNodeSelected()) {
        toast.error('Para generar tarjetas, primero selecciona un nodo.');
        return;
      }
      commandBarStore.openAiHelper('generate-flashcards');
    },
  },

  // --- Grupo: Utilidades ---
  {
    title: 'Leer Nodo',
    description: 'Iniciar la lectura en voz alta desde aquí.',
    group: 'Utilidades',
    icon: 'volume-2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const state = get(editorStore);
      if (state.selectedNodePos === null) {
        toast.error('Selecciona un nodo para empezar a leer.');
        return;
      }
      const node = editor.state.doc.nodeAt(state.selectedNodePos);
      if (node?.attrs.nodeId) {
        ttsStore.startReadingFromNode(node.attrs.nodeId);
      }
    },
  },
  // *** INICIO DE LA SOLUCIÓN: Comando Robusto ***
  {
    title: 'Editar Tarjetas',
    description: 'Abrir el editor de tarjetas para este nodo.',
    group: 'Utilidades',
    icon: 'edit-3',
    command: ({ editor, range }) => {
      // 1. Limpiamos el comando "/" del editor.
      editor.chain().focus().deleteRange(range).run();
      const state = get(editorStore);

      // 2. Verificamos que un nodo esté realmente seleccionado.
      if (state.selectedNodePos === null) {
        toast.error('Selecciona un nodo para editar sus tarjetas.');
        return;
      }

      // 3. Obtenemos el nodo y verificamos que tenga un ID.
      const node = editor.state.doc.nodeAt(state.selectedNodePos);
      if (node?.attrs.nodeId) {
        cardEditorStore.open(node.attrs.nodeId);
      } else {
        // 4. Si no hay ID, informamos al usuario.
        toast.error('Este nodo no tiene un ID válido para asociar tarjetas.');
      }
    },
  },
  // *** FIN DE LA SOLUCIÓN ***
];
