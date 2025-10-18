// src/lib/editor/extensions/SlashCommandExtension.ts
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
import { slashMenuStore } from '$lib/stores/slashMenuStore';

/**
 * @description The `SlashCommandExtension` integrates Tiptap's `Suggestion` plugin to create
 * a powerful and extensible slash command menu.
 *
 * It works by:
 * 1. Listening for the `/` character at the beginning of a new line.
 * 2. When triggered, it gets a list of available commands from `getCommands()`.
 * 3. It filters these commands based on the user's query.
 * 4. It uses the external `slashMenuStore` (a Svelte store) to handle the rendering of the UI,
 *    passing all necessary data and callbacks.
 * 5. Keyboard navigation and command execution are also delegated to the `slashMenuStore`.
 */
export const SlashCommandExtension = Extension.create<
  SuggestionOptions<CommandItem>
>({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/', // The character that triggers the suggestion menu.
        allowedPrefixes: null, // Allow any character before the trigger.

        /**
         * Provides the list of items to display in the suggestion menu.
         * The list is filtered based on the user's input (`query`).
         */
        items: ({ query }) => {
          return getCommands().filter(
            (item) =>
              item.title.toLowerCase().startsWith(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase())
          );
        },

        /**
         * The action to perform when a command is selected.
         * It calls the `command` function associated with the selected item.
         */
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },

        /**
         * Provides a renderless API that integrates with our Svelte-based UI
         * through the `slashMenuStore`.
         */
        render: () => {
          return {
            /**
             * Called when the suggestion menu is opened.
             * It opens the Svelte component via the store and passes the initial props.
             */
            onStart: (props: SuggestionProps<CommandItem>) => {
              slashMenuStore.open(
                props.items,
                props.clientRect ?? null,
                props.command,
                props.query
              );
            },

            /**
             * Called when the filtered items or query change.
             * It updates the Svelte component with the new data.
             */
            onUpdate: (props: SuggestionProps<CommandItem>) => {
              slashMenuStore.updateItems(props.items, props.query);
            },

            /**
             * Handles keyboard events, allowing for navigation within the menu.
             * It delegates the logic to the `slashMenuStore`.
             */
            onKeyDown: (props: SuggestionKeyDownProps): boolean => {
              if (props.event.key === 'ArrowUp') {
                slashMenuStore.moveSelection(-1);
                return true;
              }
              if (props.event.key === 'ArrowDown') {
                slashMenuStore.moveSelection(1);
                return true;
              }
              if (props.event.key === 'ArrowLeft') {
                slashMenuStore.moveGroup(-1);
                return true;
              }
              if (props.event.key === 'ArrowRight') {
                slashMenuStore.moveGroup(1);
                return true;
              }
              if (props.event.key === 'Enter') {
                slashMenuStore.triggerCommand();
                return true;
              }
              return false;
            },

            /**
             * Called when the suggestion menu is closed (e.g., by pressing Escape).
             * It closes the Svelte component via the store.
             */
            onExit: () => {
              slashMenuStore.close();
            },
          };
        },
      }),
    ];
  },
});
