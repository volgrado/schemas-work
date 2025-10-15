<!-- src/lib/components/editor/DocumentView.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';

  // --- Tiptap Core ---
  import { Editor, findParentNode } from '@tiptap/core';
  import * as Y from 'yjs';

  // --- Tiptap Extensions (Nativas) ---
  import Collaboration from '@tiptap/extension-collaboration';
  import Document from '@tiptap/extension-document';
  import Text from '@tiptap/extension-text';
  import Heading from '@tiptap/extension-heading';
  import Bold from '@tiptap/extension-bold';
  import Italic from '@tiptap/extension-italic';
  import Placeholder from '@tiptap/extension-placeholder';
  import Paragraph from '@tiptap/extension-paragraph';
  import ListItem from '@tiptap/extension-list-item';
  import BulletList from '@tiptap/extension-bullet-list';

  // --- Tiptap Extensions (Personalizadas) ---
  import { RoleExtension } from '$lib/editor/extensions/RoleExtension';
  import { SmartEnter } from '$lib/editor/extensions/SmartEnter';
  import { DynamicHighlighter } from '$lib/editor/extensions/DynamicHighlighter';
  import { SlashCommandExtension } from '$lib/editor/extensions/SlashCommandExtension';
  import { PositionSyncExtension } from '$lib/editor/extensions/PositionSyncExtension';
  import { NodeIdExtension } from '$lib/editor/extensions/NodeIdExtension';

  // --- Stores y Lógica de la Aplicación ---
  import { editorStore } from '$lib/stores/editorStore';
  import { documentStore } from '$lib/stores/documentStore';
  import { debounce } from '$lib/utils/debounce';

  // --- Componentes de UI ---
  import BubbleMenu from './BubbleMenu.svelte';

  // --- Props y Eventos ---
  let {
    ydoc,
    initialContent = null,
    focusedNodePos = null,
  }: {
    ydoc: Y.Doc;
    initialContent?: object | null;
    focusedNodePos?: number | null;
  } = $props();

  const dispatch = createEventDispatcher<{ focusApplied: void }>();

  let element: HTMLDivElement;
  let editor = $state<Editor | null>(null);

  const syncTitleWithStore = debounce((editorInstance: Editor) => {
    if (!editorInstance || editorInstance.isDestroyed) return;

    const firstNode = editorInstance.state.doc.firstChild;

    // ✅ CORRECCIÓN: Ahora comprobamos el tipo Y el nivel del heading.
    // Buscamos explícitamente un `h2` como primer nodo.
    if (
      firstNode &&
      firstNode.type.name === 'heading' &&
      firstNode.attrs.level === 2
    ) {
      const newTitle = firstNode.textContent.trim() || 'Esquema sin título'; // Usamos un fallback

      const currentTitleInStore = get(documentStore).metadata?.title;

      if (newTitle !== currentTitleInStore) {
        documentStore.updateTitle(newTitle);
      }
    } else {
      // (Opcional) Si el primer nodo NO es un h2, podríamos considerar que el título está vacío.
      // Esto previene que el título se quede "pegado" si el usuario borra el h2.
      const currentTitleInStore = get(documentStore).metadata?.title;
      if (currentTitleInStore !== 'Esquema sin título') {
        documentStore.updateTitle('Esquema sin título');
      }
    }
  }, 750);

  $effect(() => {
    if (focusedNodePos !== null && editor && editor.isEditable) {
      const currentSelection = editor.state.selection;
      const parentListItem = findParentNode(
        (node) => node.type.name === 'listItem'
      )(currentSelection);
      if (!parentListItem || parentListItem.pos !== focusedNodePos) {
        editor.chain().focus().setNodeSelection(focusedNodePos).run();
      }
      import('svelte').then(({ tick }) =>
        tick().then(() => dispatch('focusApplied'))
      );
    }
  });

  onMount(() => {
    const editorInstance = new Editor({
      element: element,
      extensions: [
        Document,
        Paragraph,
        ListItem,
        BulletList,
        Text,
        Heading.configure({ levels: [1, 2, 3] }),
        Bold,
        Italic,
        RoleExtension,
        SmartEnter,
        PositionSyncExtension,
        NodeIdExtension, // <<< AÑADIDO: La nueva extensión para IDs únicos
        Placeholder.configure({
          placeholder: ({ editor, node, pos }) => {
            if (node.type.name === 'heading' && node.attrs.level === 1) {
              return '¿Cuál es el título de tu esquema?';
            }
            if (node.type.name === 'paragraph' && !node.textContent) {
              const parent = editor.state.doc.resolve(pos).parent;
              if (parent.firstChild === node) {
                return 'Escribe un término... (usa Tab para anidar)';
              }
            }
            if (
              node.type.name === 'paragraph' &&
              !node.textContent &&
              node.attrs.role === 'description'
            ) {
              return 'Añade una descripción (opcional)';
            }
            return '';
          },
        }),
        DynamicHighlighter,
        SlashCommandExtension,
        Collaboration.configure({ document: ydoc }),
      ],
      editorProps: {
        attributes: {
          class: 'prose',
        },
      },
      onUpdate({ editor: updatedEditor }) {
        syncTitleWithStore(updatedEditor);

        const { selection } = updatedEditor.state; // Solo necesitamos `selection` aquí
        const listItemNode = findParentNode(
          (node) => node.type.name === 'listItem'
        )(selection);
        const newSelectedPos = listItemNode ? listItemNode.pos : null;

        editorStore.update((s) => ({
          ...s,
          // ✅ CORRECCIÓN: Usamos la referencia directa al doc del editor actualizado
          doc: updatedEditor.state.doc,
          selectedNodePos: newSelectedPos,
          contentVersion: s.contentVersion + 1,
        }));
      },
      // onSelectionUpdate puede seguir siendo una optimización, pero la mantenemos fiel a tu original
      // para evitar confusiones. Si todo está en onUpdate, también funciona.
    });

    editor = editorInstance;

    // Sincronización inicial al cargar
    syncTitleWithStore(editor);

    // Manejo del contenido inicial
    if (initialContent) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
      documentStore.clearInitialContent();
    }

    // ✅ 2. MÉTODO CORRECTO PARA PUBLICAR LA INSTANCIA (fiel a tu código)
    editorStore.update((s) => ({ ...s, instance: editor }));

    // ✅ 3. FUNCIÓN DE LIMPIEZA FIEL A TU LÓGICA `onDestroy`
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
      // Reseteamos el store a un estado completo y conocido.
      editorStore.set({
        instance: null,
        selectedNodePos: null,
        contentVersion: 0,
        doc: null, // <-- AÑADIR ESTA LÍNEA
      });
    };
  });
</script>

{#if editor}
  <BubbleMenu {editor} />
{/if}

<!-- CAMBIO: Envolver el editor en un contenedor para el layout -->
<div class="document-layout-container">
  <div bind:this={element}></div>
</div>

<style>
  /* NUEVO: Contenedor para alinear el documento */
  .document-layout-container {
    width: 100%;
    max-width: 960px; /* Alineado con el header */
    margin: 0 auto;
    padding: var(--space-xxl) var(--space-md) 50vh var(--space-md);
  }

  :global(.prose) {
    font-family: var(--font-main);
    color: var(--color-text);
    max-width: 720px;
    margin: 0 auto;
    /* CAMBIO: Padding ahora está dentro de la "hoja" */
    padding: var(--space-xl) var(--space-xxl);
    min-height: 100vh;
    outline: none;
    background-color: var(--color-background);

    /* CAMBIO: Estilos para crear el efecto "hoja de papel" */
    border-radius: var(--space-sm);
    border: 1px solid var(--color-gray-100);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  @media (prefers-color-scheme: dark) {
    :global(.prose) {
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    }
  }

  /* Ajuste para pantallas pequeñas */
  @media (max-width: 960px) {
    .document-layout-container {
      padding: var(--space-xl) 0 50vh 0;
    }
    :global(.prose) {
      border-radius: 0;
      border-left: none;
      border-right: none;
    }
  }

  :global(.prose p),
  :global(.prose li) {
    line-height: 1.7;
  }

  :global(.prose h1) {
    font-size: 2.25rem;
    margin-top: 0; /* Ajustado porque el padding superior ya da espacio */
    margin-bottom: var(--space-md);
  }

  :global(.prose h2) {
    font-size: 1.5rem;
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
  }

  :global(.prose .is-empty::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-gray-500);
    pointer-events: none;
    height: 0;
  }
</style>
