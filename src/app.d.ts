// src/app.d.ts

// Importamos los tipos de los comandos que vamos a añadir
import type { Commands as BoldCommands } from '@tiptap/extension-bold';
import type { Commands as ItalicCommands } from '@tiptap/extension-italic';
import type { Commands as HeadingCommands } from '@tiptap/extension-heading';
import type { Commands as BulletListCommands } from '@tiptap/extension-bullet-list';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

// Aquí es donde ampliamos el módulo de Tiptap
declare module '@tiptap/core' {
  // Le decimos a TypeScript que la interfaz 'Commands' ahora también incluye
  // todos los comandos de nuestras extensiones.
  interface Commands<ReturnType>
    extends BoldCommands<ReturnType>,
      ItalicCommands<ReturnType>,
      HeadingCommands<ReturnType>,
      BulletListCommands<ReturnType> {
    // ELIMINADO: Ya no gestionamos las tarjetas directamente en el nodo.
    schemaNode: {
      /**
       * Divide un `schemaNode` actual, asegurando que el nuevo nodo
       * también tenga la estructura `schemaTerm`.
       */
      splitSchemaNode: () => ReturnType;
    };
  }
}

export {};
