// src/lib/editor/slashCommands.ts
/**
 * @file Defines the slash commands available in the Tiptap editor.
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

/**
 * Represents a single command in the slash command menu.
 */
export interface CommandItem {
  /** The display name of the command. */
  title: string;
  /** A brief explanation of what the command does. */
  description: string;
  /** The category this command belongs to (e.g., "Basic", "AI"). */
  group: string;
  /** The icon to display next to the command. */
  icon: IconName;
  /**
   * The function to execute when the command is selected.
   * @param {object} props - The properties passed to the command function.
   * @param {Editor} props.editor - The Tiptap editor instance.
   * @param {Range} props.range - The range of text that triggered the command (the "/").
   */
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

/**
 * Checks if a node is currently selected in the editor.
 * @returns {boolean} `true` if a node is selected, otherwise `false`.
 * @internal
 */
const hasNodeSelected = () => get(editorStore).selectedNodePos !== null;

/**
 * Retrieves the full list of slash commands, organized by group.
 * This function is called to populate the slash command suggestion menu.
 * @returns {CommandItem[]} An array of command items.
 */
export const getCommands = (): CommandItem[] => {
  const t = gett(); // Get the translation function.
  return [
    // --- Group: Basic ---
    {
      title: $t('slashCommands.term.title'),
      description: $t('slashCommands.term.description'),
      group: $t('slashCommands.groups.basic'),
      icon: 'pen-tool',
      command: ({ editor, range }) => {
        // Toggles a standard list item, which is the default block for this app.
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: $t('slashCommands.list.title'),
      description: $t('slashCommands.list.description'),
      group: $t('slashCommands.groups.basic'),
      icon: 'list',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: $t('slashCommands.numberedList.title'),
      description: $t('slashCommands.numberedList.description'),
      group: $t('slashCommands.groups.basic'),
      icon: 'list-ordered',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },

    // --- Group: Formatting ---
    {
      title: $t('slashCommands.h1.title'),
      description: $t('slashCommands.h1.description'),
      group: $t('slashCommands.groups.formatting'),
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
      title: $t('slashCommands.h2.title'),
      description: $t('slashCommands.h2.description'),
      group: $t('slashCommands.groups.formatting'),
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
      title: $t('slashCommands.h3.title'),
      description: $t('slashCommands.h3.description'),
      group: $t('slashCommands.groups.formatting'),
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
      title: $t('slashCommands.separator.title'),
      description: $t('slashCommands.separator.description'),
      group: $t('slashCommands.groups.formatting'),
      icon: 'minus',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: $t('slashCommands.bold.title'),
      description: $t('slashCommands.bold.description'),
      group: $t('slashCommands.groups.formatting'),
      icon: 'bold',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setMark('bold').run();
      },
    },
    {
      title: $t('slashCommands.italic.title'),
      description: $t('slashCommands.italic.description'),
      group: $t('slashCommands.groups.formatting'),
      icon: 'italic',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setMark('italic').run();
      },
    },

    // --- Group: Media ---
    {
      title: $t('slashCommands.image.title'),
      description: $t('slashCommands.image.description'),
      group: $t('slashCommands.groups.media'),
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
      title: $t('slashCommands.youtube.title'),
      description: $t('slashCommands.youtube.description'),
      group: $t('slashCommands.groups.media'),
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
      title: $t('slashCommands.mathBlock.title'),
      description: $t('slashCommands.mathBlock.description'),
      group: $t('slashCommands.groups.media'),
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
      title: $t('slashCommands.mathInline.title'),
      description: $t('slashCommands.mathInline.description'),
      group: $t('slashCommands.groups.media'),
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
      title: $t('slashCommands.expandNode.title'),
      description: $t('slashCommands.expandNode.description'),
      group: $t('slashCommands.groups.ai'),
      icon: 'sparkles',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        if (!hasNodeSelected()) {
          toast.error($t('slashCommands.expandNode.error'));
          return;
        }
        commandBarStore.openAiHelper('expand-node');
      },
    },
    {
      title: $t('slashCommands.generateCards.title'),
      description: $t('slashCommands.generateCards.description'),
      group: $t('slashCommands.groups.ai'),
      icon: 'zap',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        if (!hasNodeSelected()) {
          toast.error($t('slashCommands.generateCards.error'));
          return;
        }
        commandBarStore.openAiHelper('generate-flashcards');
      },
    },

    // --- Group: Utilities ---
    {
      title: $t('slashCommands.readNode.title'),
      description: $t('slashCommands.readNode.description'),
      group: $t('slashCommands.groups.utilities'),
      icon: 'volume-2',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const state = get(editorStore);
        if (state.selectedNodePos === null) {
          toast.error($t('slashCommands.readNode.error'));
          return;
        }
        const node = editor.state.doc.nodeAt(state.selectedNodePos);
        if (node?.attrs.nodeId) {
          ttsStore.startReadingFromNode(node.attrs.nodeId);
        } else {
          toast.error($t('slashCommands.readNode.errorNoId'));
        }
      },
    },
    {
      title: $t('slashCommands.editCards.title'),
      description: $t('slashCommands.editCards.description'),
      group: $t('slashCommands.groups.utilities'),
      icon: 'edit-3',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const state = get(editorStore);
        if (state.selectedNodePos === null) {
          toast.error($t('slashCommands.editCards.error'));
          return;
        }
        const node = editor.state.doc.nodeAt(state.selectedNodePos);
        if (node?.attrs.nodeId) {
          cardEditorStore.open(node.attrs.nodeId);
        } else {
          toast.error($t('slashCommands.editCards.errorNoId'));
        }
      },
    },
  ];
};
