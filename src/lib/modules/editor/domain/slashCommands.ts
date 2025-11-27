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
} from '$lib/modules/command-bar/ui/commandBarStore.svelte';
import { editorState } from '$lib/modules/editor/ui/editorStore.svelte';
import { startReading } from '$lib/modules/tts/ui/ttsStore.svelte';
import { open as openCardEditor } from '$lib/modules/editor/ui/cardEditorStore.svelte';
import { openModal } from '$lib/stores/modalStore.svelte';
import { documentState } from '$lib/stores/documentStore.svelte';
import { gett } from '$lib/utils/i18n';
import { getReadableNodes } from '$lib/modules/tts/infra/ttsUtils';
import { toast } from 'svelte-sonner';
import { actionRegistry, type Action } from '$lib/actions/registry';

export interface SlashCommandProps {
  editor: Editor;
  range: Range;
}

/**
 * Represents a single command in the slash command menu.
 */
export interface CommandItem {
  title: string;
  description: string;
  group: string;
  icon: IconName;
  command: ({ editor, range }: SlashCommandProps) => void;
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
 * Registers all editor commands with the ActionRegistry.
 * This function is idempotent.
 */
function registerCommands() {
  const t = gett();

  const commands: Action<any>[] = [
    // --- Group: Content ---
    {
      id: 'editor.h2',
      title: t('slashCommands.h2.title'),
      description: t('slashCommands.h2.description'),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
      },
    },
    {
      id: 'editor.h3',
      title: t('slashCommands.h3.title'),
      description: t('slashCommands.h3.description'),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
      },
    },
    {
      id: 'editor.h4',
      title: t('slashCommands.h4.title', { fallback: 'Heading 4' }),
      description: t('slashCommands.h4.description', { fallback: 'Small section heading.' }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run();
      },
    },
    {
      id: 'editor.h5',
      title: t('slashCommands.h5.title', { fallback: 'Heading 5' }),
      description: t('slashCommands.h5.description', { fallback: 'Very small section heading.' }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 5 }).run();
      },
    },
    {
      id: 'editor.h6',
      title: t('slashCommands.h6.title', { fallback: 'Heading 6' }),
      description: t('slashCommands.h6.description', { fallback: 'The smallest section heading.' }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 6 }).run();
      },
    },
    {
      id: 'editor.h7',
      title: t('slashCommands.h7.title', { fallback: 'Heading 7' }),
      description: t('slashCommands.h7.description', { fallback: 'Level 7 heading.' }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 7 }).run();
      },
    },
    {
      id: 'editor.h8',
      title: t('slashCommands.h8.title', { fallback: 'Heading 8' }),
      description: t('slashCommands.h8.description', { fallback: 'Level 8 heading.' }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 8 }).run();
      },
    },
    {
      id: 'editor.h9',
      title: t('slashCommands.h9.title', { fallback: 'Heading 9' }),
      description: t('slashCommands.h9.description', { fallback: 'Level 9 heading.' }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 9 }).run();
      },
    },
    {
      id: 'editor.h10',
      title: t('slashCommands.h10.title', { fallback: 'Heading 10' }),
      description: t('slashCommands.h10.description', { fallback: 'Level 10 heading.' }),
      group: t('slashCommands.groups.content'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 10 }).run();
      },
    },

    // --- Group: Formatting ---
    {
      id: 'editor.h1',
      title: t('slashCommands.h1.title'),
      description: t('slashCommands.h1.description'),
      group: t('slashCommands.groups.formatting'),
      icon: 'type',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
      },
    },
    {
      id: 'editor.separator',
      title: t('slashCommands.separator.title'),
      description: t('slashCommands.separator.description'),
      group: t('slashCommands.groups.formatting'),
      icon: 'minus',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      id: 'editor.bold',
      title: t('slashCommands.bold.title'),
      description: t('slashCommands.bold.description'),
      group: t('slashCommands.groups.formatting'),
      icon: 'bold',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).toggleMark('bold').run();
      },
    },
    {
      id: 'editor.italic',
      title: t('slashCommands.italic.title'),
      description: t('slashCommands.italic.description'),
      group: t('slashCommands.groups.formatting'),
      icon: 'italic',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).toggleMark('italic').run();
      },
    },

    // --- Group: Media ---
    {
      id: 'editor.youtube',
      title: t('slashCommands.youtube.title'),
      description: t('slashCommands.youtube.description'),
      group: t('slashCommands.groups.media'),
      icon: 'video',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).run();
        const pos = range.from;
        editor.chain().insertContentAt(pos, { type: 'youtube', attrs: { src: null } }).run();
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
      id: 'editor.mathBlock',
      title: t('slashCommands.mathBlock.title'),
      description: t('slashCommands.mathBlock.description'),
      group: t('slashCommands.groups.media'),
      icon: 'plus-slash-minus',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
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
      id: 'editor.mathInline',
      title: t('slashCommands.math_inline.title'),
      description: t('slashCommands.math_inline.description'),
      group: t('slashCommands.groups.media'),
      icon: 'plus-slash-minus',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
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
      id: 'editor.readNode',
      title: t('slashCommands.readNode.title'),
      description: t('slashCommands.readNode.description'),
      group: t('slashCommands.groups.utilities'),
      icon: 'volume-2',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
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
      id: 'editor.editCards',
      title: t('slashCommands.editCards.title'),
      description: t('slashCommands.editCards.description'),
      group: t('slashCommands.groups.utilities'),
      icon: 'edit-3',
      context: 'editor',
      handler: (ctx: unknown) => {
        const { editor, range } = ctx as SlashCommandProps;
        editor.chain().focus().deleteRange(range).run();
        const docId = documentState.docId;
        if (docId) {
          openCardEditor(docId);
        } else {
          toast.error(t('slashCommands.editCards.error'));
        }
      },
    },
  ];

  commands.forEach(cmd => actionRegistry.register(cmd));
}

/**
 * Retrieves the full list of slash commands from the ActionRegistry.
 * Registers them if not already registered.
 * @returns {CommandItem[]} An array of command items.
 */
export const getCommands = (): CommandItem[] => {
  // Ensure commands are registered
  registerCommands();

  // Retrieve editor actions
  const actions = actionRegistry.getActionsByContext('editor');

  // Map to CommandItem format expected by Tiptap extension
  return actions.map(action => ({
    title: action.title,
    description: action.description || '',
    group: action.group || 'General',
    icon: action.icon || 'help-circle', // Fallback to a valid icon
    command: ({ editor, range }) => {
      actionRegistry.execute(action.id, { editor, range });
    }
  }));
};

