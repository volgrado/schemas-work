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
import { getCommands, type CommandItem } from '../slashCommands';
// CORRECTION: Import the specific, standalone functions from the Rune-based store.
import {
  open,
  close,
  updateItems,
  moveSelection,
  moveGroup,
  triggerCommand,
} from '$lib/stores/slashMenuStore.svelte';

/**
 * @description The `SlashCommandExtension` integrates Tiptap's `Suggestion` plugin to create
 * a powerful and extensible slash command menu.
 *
 * It works by orchestrating communication between Tiptap's suggestion logic and the standalone
 * functions of the Rune-based `slashMenuStore`, which manages the UI's reactive state.
 */
export const SlashCommandExtension = Extension.create<
  SuggestionOptions<CommandItem>
>({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        allowedPrefixes: null,

        items: ({ query }) => {
          return getCommands().filter(
            (item) =>
              item.title.toLowerCase().startsWith(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase())
          );
        },

        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },

        render: () => {
          return {
            onStart: (props: SuggestionProps<CommandItem>) => {
              // CORRECTION: Call the imported `open` function directly.
              open(
                props.items,
                props.clientRect ?? null,
                props.command,
                props.query
              );
            },

            onUpdate: (props: SuggestionProps<CommandItem>) => {
              // CORRECTION: Call the imported `updateItems` function directly.
              updateItems(props.items, props.query);
            },

            onKeyDown: (props: SuggestionKeyDownProps): boolean => {
              if (props.event.key === 'ArrowUp') {
                // CORRECTION: Call the imported `moveSelection` function directly.
                moveSelection(-1);
                return true;
              }
              if (props.event.key === 'ArrowDown') {
                moveSelection(1);
                return true;
              }
              if (props.event.key === 'ArrowLeft') {
                // CORRECTION: Call the imported `moveGroup` function directly.
                moveGroup(-1);
                return true;
              }
              if (props.event.key === 'ArrowRight') {
                moveGroup(1);
                return true;
              }
              if (props.event.key === 'Enter') {
                // CORRECTION: Call the imported `triggerCommand` function directly.
                triggerCommand();
                return true;
              }
              return false;
            },

            onExit: () => {
              // CORRECTION: Call the imported `close` function directly.
              close();
            },
          };
        },
      }),
    ];
  },
});
