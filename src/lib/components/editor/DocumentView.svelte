<!-- src/lib/components/editor/DocumentView.svelte (VERSIÓN COMPLETA - FIN DE SPRINT 1) -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';

  // --- Tiptap Core ---
  import { Editor, findParentNode } from '@tiptap/core';
  import * as Y from 'yjs';

  // --- Tiptap Extensions (Nativas) ---
  import Collaboration from '@tiptap/extension-collaboration';
  import Document from '@tiptap/extension-document';
  import Paragraph from '@tiptap/extension-paragraph';
  import Text from '@tiptap/extension-text';
  import Heading from '@tiptap/extension-heading';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import BulletList from '@tiptap/extension-bullet-list';
  import OrderedList from '@tiptap/extension-ordered-list';

  // --- Tiptap Extensions (Personalizadas) ---
  import { FlippableListItem } from '$lib/editor/extensions/FlippableListItem';
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';

  // --- Stores y Lógica de la Aplicación ---
  import { editorStore } from '$lib/stores/editorStore';
  import { documentStore } from '$lib/stores/documentStore';

  // --- Componentes de UI ---
  import BubbleMenu from './BubbleMenu.svelte';

  // Props recibidas desde +page.svelte
  export let ydoc: Y.Doc;
  export let initialContent: object | null = null;

  let element: HTMLDivElement;
  let editor: Editor;

  onMount(() => {
    editor = new Editor({
      element: element,
      extensions: [
        // Nodos y Marcas Básicas
        Document,
        Paragraph,
        Text,
        Heading.configure({ levels: [1, 2, 3] }),
        Bold,
        Italic,
        BulletList,
        OrderedList,

        // Nuestras Extensiones Personalizadas
        FlippableListItem, // Permite guardar tarjetas de estudio en los <li>
        DynamicHighlighter, // Resalta nodos para Repaso y TTS
        SlashCommandExtension, // Activa el menú de comandos con "/"

        // Funcionalidad Colaborativa
        Collaboration.configure({ document: ydoc }),
      ],
      editorProps: {
        attributes: {
          class: 'prose', // Aplica estilos base a la zona editable
        },
      },

      // Este hook se ejecuta en cada cambio, actualizando el estado global
      onUpdate({ editor }) {
        const { selection } = editor.state;
        const listItemNode = findParentNode(
          (node) => node.type.name === 'listItem'
        )(selection);

        if (listItemNode) {
          // Si estamos en un <li>, guardamos su posición en el store
          // para que otros componentes (como la CommandBar) sepan qué nodo está activo.
          if (listItemNode.pos !== get(editorStore).selectedNodePos) {
            editorStore.update((s) => ({
              ...s,
              selectedNodePos: listItemNode.pos,
            }));
          }
        } else {
          // Si no estamos en un <li>, reseteamos la posición en el store.
          if (get(editorStore).selectedNodePos !== null) {
            editorStore.update((s) => ({ ...s, selectedNodePos: null }));
          }
        }
      },
    });

    // Si se está creando un documento nuevo con contenido inicial (ej. desde la IA),
    // se inserta aquí.
    if (initialContent) {
      editor.commands.setContent(initialContent);
      documentStore.clearInitialContent(); // Limpiamos para no volver a insertarlo
    }

    // Hacemos que la instancia del editor sea accesible globalmente a través del store.
    editorStore.update((s) => ({ ...s, instance: editor }));
  });

  // Limpieza al desmontar el componente para evitar fugas de memoria
  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
    // Reseteamos el store del editor
    editorStore.set({ instance: null, selectedNodePos: null });
  });
</script>

{#if editor}
  <BubbleMenu {editor} />
{/if}

<div bind:this={element}></div>

<style>
  :global(.prose) {
    font-family: var(--font-main);
    color: var(--color-text);
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-xxl) var(--space-md);
    padding-bottom: 50vh; /* Añade espacio al final para poder hacer scroll más allá del último elemento */
    min-height: 100vh;
    outline: none;
  }

  :global(.prose p),
  :global(.prose li) {
    line-height: 1.7;
  }

  :global(.prose h1) {
    font-size: 2.25rem;
    margin-top: var(--space-xl);
    margin-bottom: var(--space-md);
  }
  :global(.prose h2) {
    font-size: 1.5rem;
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }

  /* Placeholder para cuando un heading o párrafo está vacío */
  :global(.prose .is-empty::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-gray-500);
    pointer-events: none;
    height: 0;
  }
</style>
