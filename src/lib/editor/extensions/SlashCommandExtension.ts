// src/lib/editor/extensions/SlashCommandExtension.ts

import { Extension } from '@tiptap/core';
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from '@tiptap/suggestion';
import { getCommands, type CommandItem } from '../slashCommands';
import { slashMenuStore } from '$lib/stores/slashMenuStore';

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
              slashMenuStore.open(
                props.items,
                props.clientRect ?? null,
                props.command,
                props.query
              );
            },

            onUpdate: (props: SuggestionProps<CommandItem>) => {
              slashMenuStore.updateItems(props.items, props.query);
            },

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

            onExit: () => {
              slashMenuStore.close();
            },
          };
        },
      }),
    ];
  },
});
