/**
 * @file schema.ts
 * @module editor
 * @description
 * Defines the static ProseMirror schema used by the application's editor.
 *
 * This schema serves as the single source of truth for the document structure,
 * defining all allowed nodes (e.g., headings, paragraphs, images) and marks
 * (e.g., bold, italic). It is constructed by combining the schema definitions
 * from the Tiptap extensions used in the editor.
 *
 * IMPORTANT: This schema must match the configuration in `EditorController.ts`
 * to ensure that documents are parsed and serialized correctly. Discrepancies
 * can lead to data loss or rendering errors.
 */

import { getSchema } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import YouTube from '@tiptap/extension-youtube';
import { ResizableImage } from '$lib/modules/editor/infra/extensions/ResizableImage';
import { NodeIdExtension } from '$lib/modules/editor/infra/extensions/NodeIdExtension';
import { MathInline, MathBlock } from '$lib/modules/editor/infra/extensions/Math';

/**
 * The list of Tiptap extensions that contribute to the document schema.
 * This includes all Node and Mark extensions. Functional extensions (like history or placeholder)
 * do not modify the schema and are therefore excluded from this list.
 */
const extensions = [
  Document,
  Paragraph,
  Text,
  // Configure headings to support deep nesting (levels 1-10) for complex schemas.
  // @ts-ignore - Tiptap types default to 6, but the underlying implementation supports more.
  Heading.configure({ levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }),
  Bold,
  Italic,
  HorizontalRule,
  YouTube.configure({}),
  ResizableImage.configure({}),
  NodeIdExtension, // Adds 'nodeId' attribute to headings
  MathInline,      // Adds inline LaTeX support
  MathBlock,       // Adds block-level LaTeX support
];

/**
 * The generated ProseMirror schema.
 * This object is used for offline document processing (e.g., in `yjsUtils.ts`)
 * where a full editor instance is not available.
 */
export const schema = getSchema(extensions);
