import { Extension } from '@tiptap/core';
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from '@tiptap/suggestion';
import { SvelteRenderer } from '../SvelteRenderer';
import SlashMenu from '$lib/components/editor/SlashMenu.svelte';
import { getCommands, type CommandItem } from '../slashCommands';
import tippy from 'tippy.js';
import type { Instance, Props } from 'tippy.js';
import type { SvelteComponent } from 'svelte';

export const SlashCommandExtension = Extension.create<
  SuggestionOptions<CommandItem>
>({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        // La propiedad 'editor' se proporciona aquí, dentro del scope donde `this.editor` es válido.
        editor: this.editor,

        // El resto de la configuración que ya teníamos
        char: '/',
        items: ({ query }) => {
          return getCommands().filter((item) =>
            item.title.toLowerCase().startsWith(query.toLowerCase())
          );
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },

        render: () => {
          let renderer: SvelteRenderer;
          let popup: Instance<Props>;

          return {
            onStart: (props: SuggestionProps<CommandItem>) => {
              renderer = new SvelteRenderer(
                SlashMenu as unknown as typeof SvelteComponent,
                {
                  editor: props.editor,
                  props,
                }
              );

              if (!props.clientRect) {
                return;
              }

              popup = tippy(document.body, {
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(),
                appendTo: () => document.body,
                content: renderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate(props: SuggestionProps<CommandItem>) {
              renderer.update(props);
              if (!props.clientRect) {
                return;
              }
              popup.setProps({
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(),
              });
            },

            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === 'Escape') {
                popup.hide();
                return true;
              }
              return (renderer.component as any).onKeyDown(props);
            },

            onExit() {
              if (popup) popup.destroy();
              if (renderer) renderer.destroy();
            },
          };
        },
      }),
    ];
  },
});
