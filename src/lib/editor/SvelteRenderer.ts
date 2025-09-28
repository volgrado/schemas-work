import type { Editor } from '@tiptap/core';
import type { SvelteComponent } from 'svelte';

interface SvelteRendererOptions {
  editor: Editor;
  props?: Record<string, any>;
}

export class SvelteRenderer {
  component: SvelteComponent;
  element: HTMLElement;
  editor: Editor;
  props: Record<string, any>;

  constructor(
    component: typeof SvelteComponent,
    { editor, props = {} }: SvelteRendererOptions
  ) {
    this.editor = editor;
    this.props = props;
    this.element = document.createElement('div');

    // Montamos el componente Svelte en nuestro div contenedor
    this.component = new component({
      target: this.element,
      props: {
        ...props,
        editor,
      },
    });
  }

  // Tiptap llamará a este método cuando los props cambien
  update(props: Record<string, any>): void {
    this.props = { ...this.props, ...props };
    this.component.$set(this.props);
  }

  // Tiptap llamará a este método para destruir el componente
  destroy(): void {
    this.component.$destroy();
  }
}
