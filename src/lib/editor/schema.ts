import { Schema } from 'prosemirror-model';
import { getSchema } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import YouTube from '@tiptap/extension-youtube';
import { ResizableImage } from '$lib/editor/extensions/ResizableImage';
import { NodeIdExtension } from '$lib/editor/extensions/NodeIdExtension';
import { MathInline, MathBlock } from '$lib/editor/extensions/Math';

// Define the extensions that contribute to the schema (nodes and marks).
// We exclude UI-only extensions like Placeholder, Gapcursor, Collaboration, etc.
const extensions = [
  Document,
  Paragraph,
  Text,
  // @ts-ignore - Allow custom heading levels up to 10
  Heading.configure({ levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }),
  Bold,
  Italic,
  HorizontalRule,
  YouTube.configure({}),
  ResizableImage.configure({}),
  NodeIdExtension,
  MathInline,
  MathBlock,
];

export const schema = getSchema(extensions);
