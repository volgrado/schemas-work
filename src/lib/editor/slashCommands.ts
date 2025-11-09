/**
 * @file Defines the slash commands available in the Tiptap editor.
 * @module slashCommands
 */

import type { Editor, Range } from '@tiptap/core';
import type { IconName } from '$lib/types/iconName';
import type { Modal } from '$lib/types';
import {
  openStrategySession,
  type StrategySessionContext,
} from '$lib/stores/commandBarStore.svelte';
import { editorState } from '$lib/stores/editorStore.svelte';
import { startReading } from '$lib/stores/ttsStore.svelte';
import { open as openCardEditor } from '$lib/stores/cardEditorStore.svelte';
import { openModal } from '$lib/stores/modalStore.svelte';
// VVVV CORRECTED IMPORT VVVV
import { documentState } from '$lib/stores/documentStore.svelte';
import { gett } from '$lib/utils/i18n';
import { getReadableNodes } from '$lib/utils/ttsUtils';
import { toast } from 'svelte-sonner';

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
        editor.chain().focus().deleteRange(range).toggleMark('bold').run();
      },
    },
    {
      title: t('slashCommands.italic.title'),
      description: t('slashCommands.italic.description'),
      group: t('slashCommands.groups.formatting'),
      icon: 'italic',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleMark('italic').run();
      },
    },

    // --- Group: Media ---
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
          const config: Modal.MediaConfig = {
            type: 'media',
            nodeType: 'youtube',
            nodePos: pos,
            attrs: node.attrs,
          };
          openModal(config);
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
        editor.chain().insertContentAt(pos, { type: 'math_block' }).run();
        const node = editor.state.doc.nodeAt(pos);
        if (node) {
          const config: Modal.FormulaConfig = {
            type: 'formula',
            nodePos: pos,
            nodeType: 'math_block',
            initialFormula: node.attrs.formula,
          };
          openModal(config);
        }
      },
    },
    {
      title: t('slashCommands.math_inline.title'),
      description: t('slashCommands.math_inline.description'),
      group: t('slashCommands.groups.media'),
      icon: 'plus-slash-minus',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const pos = range.from;
        editor.chain().insertContentAt(pos, { type: 'math_inline' }).run();
        const node = editor.state.doc.nodeAt(pos);
        if (node) {
          const config: Modal.FormulaConfig = {
            type: 'formula',
            nodePos: pos,
            nodeType: 'math_inline',
            initialFormula: node.attrs.formula,
          };
          openModal(config);
        }
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
          startReading(playlist);
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
        // VVVV CORRECTED STATE ACCESS VVVV
        const docId = documentState.docId;
        if (docId) {
          openCardEditor(docId);
        } else {
          toast.error(t('slashCommands.editCards.error'));
        }
      },
    },
  ];
};
