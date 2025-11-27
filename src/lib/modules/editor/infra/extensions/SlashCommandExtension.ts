/**
 * @file Implements the `SlashCommandExtension` for the Tiptap editor.
 * This extension provides a command menu that appears when the user types `/`,
 * allowing them to quickly insert special nodes or apply formatting.
 */

import { Extension } from '@tiptap/core';
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from '@tiptap/suggestion';
import { getCommands, type CommandItem } from '../../domain/slashCommands';
// CORRECTION: Import the specific, standalone functions from the Rune-based store.
import {
  open,
  close,
  updateItems,
  moveSelection,
  moveGroup,
  triggerCommand,
} from '$lib/stores/slashMenuStore.svelte';
import { uiState } from '$lib/stores/uiStore.svelte';

/**
 * @description The `SlashCommandExtension` integrates Tiptap's `Suggestion` plugin to create
 * a powerful and extensible slash command menu.
 *
 * It works by orchestrating communication between Tiptap's suggestion logic and the standalone
 * functions of the Rune-based `slashMenuStore`, which manages the UI's reactive state.
 */
export interface SlashCommandOptions extends SuggestionOptions<CommandItem> {
  allowAnyView?: boolean;
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      allowAnyView: false,
      char: '/',
      allowSpaces: false,
      startOfLine: false,
      allowedPrefixes: null,
      decorationTag: 'span',
      decorationClass: 'suggestion',
      command: ({ editor, range, props }) => {
        props.command({ editor, range });
      },
      items: ({ query }) => {
        return getCommands().filter(
          (item: CommandItem) =>
            item.title.toLowerCase().startsWith(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase())
        );
      },
    } as SlashCommandOptions;
  },

  addProseMirrorPlugins() {
    const { editor, render, ...options } = this.options;

    return [
      Suggestion({
        editor: this.editor,
        ...options,
        render: () => {
          return {
            onStart: (props: SuggestionProps<CommandItem>) => {
              // Prevent opening if not in editor view, unless allowed
              if (!this.options.allowAnyView && uiState.activeView !== 'editor') return;

              open(
                props.items,
                props.clientRect ?? null,
                props.command,
                props.query
              );
            },

            onUpdate: (props: SuggestionProps<CommandItem>) => {
              updateItems(props.items, props.query);
            },

            onKeyDown: (props: SuggestionKeyDownProps): boolean => {
              if (props.event.key === 'ArrowUp') {
                moveSelection(-1);
                return true;
              }
              if (props.event.key === 'ArrowDown') {
                moveSelection(1);
                return true;
              }
              if (props.event.key === 'ArrowLeft') {
                moveGroup(-1);
                return true;
              }
              if (props.event.key === 'ArrowRight') {
                moveGroup(1);
                return true;
              }
              if (props.event.key === 'Enter') {
                triggerCommand();
                return true;
              }
              return false;
            },

            onExit: () => {
              close();
            },
          };
        },
      }),
    ];
  },
});
