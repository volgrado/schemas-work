/**
 * @file app.d.ts
 * @description
 * Global type declarations and augmentations for the SvelteKit application.
 *
 * This file is responsible for:
 * 1. Defining the standard SvelteKit `App` namespace (Locals, PageData, etc.).
 * 2. Augmenting the `@tiptap/core` module to add custom commands to the editor's type system.
 *    This ensures TypeScript knows about commands like `editor.chain().setNodeId()`.
 */

// Import command types from Tiptap extensions to merge them
import type { Commands as BoldCommands } from '@tiptap/extension-bold';
import type { Commands as ItalicCommands } from '@tiptap/extension-italic';
import type { Commands as HeadingCommands } from '@tiptap/extension-heading';
import type { Commands as BulletListCommands } from '@tiptap/extension-bullet-list';

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

// --- Tiptap Command Augmentation ---
declare module '@tiptap/core' {
  interface Commands<ReturnType>
    extends BoldCommands<ReturnType>,
      ItalicCommands<ReturnType>,
      HeadingCommands<ReturnType>,
      BulletListCommands<ReturnType> {

    /**
     * Custom command extensions can be declared here.
     * Example: Commands related to the `schemaNode` or other custom nodes.
     */
    schemaNode: {
      splitSchemaNode: () => ReturnType;
    };

    // Note: Commands for NodeIdExtension, TTSHighlightExtension, etc.,
    // are typically declared within their respective extension files,
    // but can be centralized here if needed for broader visibility.
  }
}

export {};
