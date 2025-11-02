/**
 * @file Defines the slash commands available in the Tiptap editor.
 * FINAL CLEANUP (OPTION A): All list-related commands have been removed to
 * align with the removal of list extensions from the editor.
 * @module slashCommands
 */

import type { Editor, Range } from '@tiptap/core';
import type { IconName } from '$lib/types/iconName';
import { commandBarStore } from '$lib/stores/commandBarStore';
import { editorStore } from '$lib/stores/editorStore';
import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { ttsStore } from '$lib/stores/ttsStore';
import { cardEditorStore } from '$lib/stores/cardEditorStore';
import {
  modalStore,
  type MediaModalConfig,
  type FormulaModalConfig,
} from '$lib/stores/modalStore';
import { gett } from '$lib/utils/i18n';
import { getReadableNodes } from '$lib/utils/ttsUtils';
import { documentStore } from '$lib/stores/documentStore'; // <-- IMPORT ADDED FOR LOGIC FIX

/**
 * Represents a single command in the slash command menu.
 */
export interface CommandItem {
  title: string;
  description: string;
  group: string;
  icon: IconName;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

/**
 * Finds the nodeId of the heading that governs the current selection's position.
 * @internal
 */
function findCurrentSectionNodeId(editor: Editor): string | null {
  const { selection, doc } = editor.state;
  let lastHeadingNodeId: string | null = null;

  doc.nodesBetween(0, selection.from, (node) => {
    if (
      node.type.name === 'heading' &&
      node.attrs.level > 1 &&
      node.attrs.nodeId
    ) {
      lastHeadingNodeId = node.attrs.nodeId;
    }
  });
  return lastHeadingNodeId;
}

/**
 * Checks if a heading node is currently "active".
 * @internal
 */
const hasNodeSelected = () => get(editorStore).selectedNodePos !== null;

/**
 * Retrieves the full list of slash commands.
 * @returns {CommandItem[]} An array of command items.
 */
export const getCommands = (): CommandItem[] => {
  const t = gett();
  return [
    // --- Group: Content ---
    {
      title: t('slashCommands.h2.title'),
      description: t('slashCommands.h2.description'),
      group: t('slashCommands.groups.content'),
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
      title: t('slashCommands.h3.title'),
      description: t('slashCommands.h3.description'),
      group: t('slashCommands.groups.content'),
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
    // --- NEW HEADING COMMANDS ADDED ---
    {
      title: t('slashCommands.h4.title', { fallback: 'Heading 4' }),
      description: t('slashCommands.h4.description', {
        fallback: 'Small section heading.',
      }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 4 })
          .run();
      },
    },
    {
      title: t('slashCommands.h5.title', { fallback: 'Heading 5' }),
      description: t('slashCommands.h5.description', {
        fallback: 'Very small section heading.',
      }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 5 })
          .run();
      },
    },
    {
      title: t('slashCommands.h6.title', { fallback: 'Heading 6' }),
      description: t('slashCommands.h6.description', {
        fallback: 'The smallest section heading.',
      }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode('heading', { level: 6 })
          .run();
      },
    },
    // --- END OF NEW COMMANDS ---

    // --- Group: Formatting ---
    {
      title: t('slashCommands.h1.title'),
      description: t('slashCommands.h1.description'),
      group: t('slashCommands.groups.formatting'),
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
      title: t('slashCommands.separator.title'),
      description: t('slashCommands.separator.description'),
      group: t('slashCommands.groups.formatting'),
      icon: 'minus',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: t('slashCommands.bold.title'),
      description: t('slashCommands.bold.description'),
      group: t('slashCommands.groups.formatting'),
      icon: 'bold',
      command: ({ editor, range }) => {
        // toggleMark turns "bold mode" on for the text you are about to type.
        editor.chain().focus().deleteRange(range).toggleMark('bold').run();
      },
    },
    {
      title: t('slashCommands.italic.title'),
      description: t('slashCommands.italic.description'),
      group: t('slashCommands.groups.formatting'),
      icon: 'italic',
      command: ({ editor, range }) => {
        // toggleMark turns "italic mode" on for the text you are about to type.
        editor.chain().focus().deleteRange(range).toggleMark('italic').run();
      },
    },

    // --- Group: Media ---
    {
      title: t('slashCommands.image.title'),
      description: t('slashCommands.image.description'),
      group: t('slashCommands.groups.media'),
      icon: 'image',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const pos = range.from;
        editor
          .chain()
          .insertContentAt(pos, { type: 'image', attrs: { src: null } })
          .run();
        const node = editor.state.doc.nodeAt(pos);
        if (node) {
          const config: MediaModalConfig = {
            type: 'media',
            nodeType: 'image',
            nodePos: pos,
            attrs: node.attrs,
          };
          modalStore.open(config);
        }
      },
    },
    {
      title: t('slashCommands.youtube.title'),
      description: t('slashCommands.youtube.description'),
      group: t('slashCommands.groups.media'),
      icon: 'video',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const pos = range.from;
        editor
          .chain()
          .insertContentAt(pos, { type: 'youtube', attrs: { src: null } })
          .run();
        const node = editor.state.doc.nodeAt(pos);
        if (node) {
          const config: MediaModalConfig = {
            type: 'media',
            nodeType: 'youtube',
            nodePos: pos,
            attrs: node.attrs,
          };
          modalStore.open(config);
        }
      },
    },
    {
      title: t('slashCommands.mathBlock.title'),
      description: t('slashCommands.mathBlock.description'),
      group: t('slashCommands.groups.media'),
      icon: 'plus-slash-minus',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const pos = range.from;
        editor.chain().insertContentAt(pos, { type: 'mathBlock' }).run();
        const node = editor.state.doc.nodeAt(pos);
        if (node) {
          const config: FormulaModalConfig = {
            type: 'formula',
            nodePos: pos,
            attrs: node.attrs as { formula: string },
          };
          modalStore.open(config);
        }
      },
    },
    {
      title: t('slashCommands.mathInline.title'),
      description: t('slashCommands.mathInline.description'),
      group: t('slashCommands.groups.media'),
      icon: 'plus-slash-minus',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const pos = range.from;
        editor.chain().insertContentAt(pos, { type: 'mathInline' }).run();
        const node = editor.state.doc.nodeAt(pos);
        if (node) {
          const config: FormulaModalConfig = {
            type: 'formula',
            nodePos: pos,
            attrs: node.attrs as { formula: string },
          };
          modalStore.open(config);
        }
      },
    },

    // --- Group: AI ---
    {
      title: t('slashCommands.expandNode.title'),
      description: t('slashCommands.expandNode.description'),
      group: t('slashCommands.groups.ai'),
      icon: 'sparkles',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        if (!hasNodeSelected()) {
          toast.error(t('slashCommands.expandNode.error'));
          return;
        }
        commandBarStore.openAiHelper('expand-node');
      },
    },
    {
      title: t('slashCommands.generateCards.title'),
      description: t('slashCommands.generateCards.description'),
      group: t('slashCommands.groups.ai'),
      icon: 'zap',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        if (!hasNodeSelected()) {
          toast.error(t('slashCommands.generateCards.error'));
          return;
        }
        commandBarStore.openAiHelper('generate-flashcards-node');
      },
    },

    // --- Group: Utilities ---
    {
      title: t('slashCommands.readNode.title'),
      description: t('slashCommands.readNode.description'),
      group: t('slashCommands.groups.utilities'),
      icon: 'volume-2',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const startNodeId = findCurrentSectionNodeId(editor);
        const allNodes = getReadableNodes(editor);
        const startIndex = startNodeId
          ? allNodes.findIndex((node) => node.node.attrs.nodeId === startNodeId)
          : 0;

        const playlist = allNodes.slice(startIndex > -1 ? startIndex : 0);
        if (playlist.length > 0) {
          ttsStore.startReading(playlist);
        } else {
          toast.error(t('slashCommands.readNode.error'));
        }
      },
    },
    {
      title: t('slashCommands.editCards.title'),
      description: t('slashCommands.editCards.description'),
      group: t('slashCommands.groups.utilities'),
      icon: 'edit-3',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        // LOGIC FIX: The card editor is document-wide, not node-specific.
        const docId = get(documentStore).docId;

        if (docId) {
          cardEditorStore.open(docId);
        } else {
          toast.error(t('slashCommands.editCards.error'));
        }
      },
    },
  ];
};
