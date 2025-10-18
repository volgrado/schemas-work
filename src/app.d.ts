// src/app.d.ts

// Import the types of the commands we are going to add
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
    interface PageData {
      lang: string;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

// This is where we extend the Tiptap module
declare module '@tiptap/core' {
  // We tell TypeScript that the 'Commands' interface now also includes
  // all the commands from our extensions.
  interface Commands<ReturnType>
    extends BoldCommands<ReturnType>,
      ItalicCommands<ReturnType>,
      HeadingCommands<ReturnType>,
      BulletListCommands<ReturnType> {
    // REMOVED: We no longer manage cards directly in the node.
    schemaNode: {
      /**
       * Splits a current `schemaNode`, ensuring that the new node
       * also has the `schemaTerm` structure.
       */
      splitSchemaNode: () => ReturnType;
    };
  }
}

export {};
