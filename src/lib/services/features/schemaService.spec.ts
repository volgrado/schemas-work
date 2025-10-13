import { describe, it, expect } from 'vitest';
import { documentToTreeData, getBreadcrumbForPosition } from './schemaService';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { Fragment, Schema } from 'prosemirror-model';

describe('schemaService', () => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'heading bulletList' },
      heading: { attrs: { level: { default: 1 } }, content: 'text*' },
      bulletList: { content: 'listItem+' },
      listItem: { content: 'paragraph bulletList?' },
      paragraph: { attrs: { role: { default: null } }, content: 'text*' },
      text: {},
    },
  });

  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Test Schema' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            attrs: { pos: 10 },
            content: [
              {
                type: 'paragraph',
                attrs: { role: 'term' },
                content: [{ type: 'text', text: 'Node 1' }],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    attrs: { pos: 20 },
                    content: [
                      {
                        type: 'paragraph',
                        attrs: { role: 'term' },
                        content: [{ type: 'text', text: 'Node 1.1' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            attrs: { pos: 30 },
            content: [
              {
                type: 'paragraph',
                attrs: { role: 'term' },
                content: [{ type: 'text', text: 'Node 2' }],
              },
            ],
          },
        ],
      },
    ],
  }) as ProseMirrorNode;

  it('should convert a ProseMirror document to tree data', () => {
    const treeData = documentToTreeData(doc);
    expect(treeData).toEqual({
      id: 'root-title',
      content: 'Test Schema',
      children: [
        {
          id: 'node-10',
          content: 'Node 1',
          children: [
            {
              id: 'node-20',
              content: 'Node 1.1',
              children: [],
            },
          ],
        },
        {
          id: 'node-30',
          content: 'Node 2',
          children: [],
        },
      ],
    });
  });
});