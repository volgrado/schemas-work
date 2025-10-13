import { describe, it, expect } from 'vitest';
import { documentToTreeData, getBreadcrumbForPosition } from './schemaService';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { Schema } from 'prosemirror-model';

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

  const doc = schema.node(
    'doc',
    {},
    [
      schema.node('heading', { level: 2 }, [schema.text('Test Schema')]),
      schema.node('bulletList', {}, [
        schema.node('listItem', { pos: 10 }, [
          schema.node('paragraph', { role: 'term' }, [schema.text('Node 1')]),
          schema.node('bulletList', {}, [
            schema.node('listItem', { pos: 20 }, [
              schema.node('paragraph', { role: 'term' }, [
                schema.text('Node 1.1'),
              ]),
            ]),
          ]),
        ]),
        schema.node('listItem', { pos: 30 }, [
          schema.node('paragraph', { role: 'term' }, [schema.text('Node 2')]),
        ]),
      ]),
    ],
  ) as ProseMirrorNode;

  it.skip('should convert a ProseMirror document to tree data', () => {
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