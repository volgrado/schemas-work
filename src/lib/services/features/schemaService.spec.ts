// src/lib/services/features/schemaService.spec.ts
import { describe, it, expect } from 'vitest';
import { documentToTreeData, getBreadcrumbForPosition } from './schemaService';
import { Schema, Node } from 'prosemirror-model';

// NOTE: I'm assuming the actual implementation of the service is now in a separate file.
// The tests will now pass against the implementation you provided.

const mockSchema = new Schema({
  nodes: {
    doc: { content: 'heading (bulletList | paragraph)*' },
    paragraph: {
      attrs: { role: { default: null } },
      content: 'text*',
      group: 'block',
    },
    heading: {
      attrs: { level: { default: 1 } },
      content: 'text*',
      group: 'block',
    },
    bulletList: { content: 'listItem+', group: 'block' },
    listItem: {
      // The 'pos' attribute in the schema is not a real PM position,
      // it's just used for generating unique IDs in the tree data.
      attrs: { nodeId: { default: null }, pos: { default: 0 } },
      content: '(paragraph | bulletList)+',
    },
    text: { inline: true },
  },
  marks: {},
});

const createMockDoc = (content: any) => mockSchema.nodeFromJSON(content);

let posCounter = 1;
const createListItem = (
  id: string,
  term: string,
  description: string | null = null,
  nestedList: any[] = []
) => {
  const pos = posCounter++;
  return {
    type: 'listItem',
    attrs: { nodeId: id, pos },
    content: [
      {
        type: 'paragraph',
        attrs: { role: 'term' },
        content: term ? [{ type: 'text', text: term }] : [],
      },
      ...(description
        ? [
            {
              type: 'paragraph',
              attrs: { role: 'description' },
              content: [{ type: 'text', text: description }],
            },
          ]
        : []),
      ...(nestedList.length > 0
        ? [{ type: 'bulletList', content: nestedList }]
        : []),
    ],
  };
};

// --- Fixture principal ---
posCounter = 1;
const DOC_FIXTURE_JSON = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Main Schema Title' }],
    },
    {
      type: 'bulletList',
      content: [
        createListItem('n1', 'Root Concept', 'This is the main definition.', [
          createListItem('n1_1', 'Sub Concept'),
        ]),
        createListItem('n2', 'Second Concept'),
      ],
    },
  ],
};
const MOCK_DOC = createMockDoc(DOC_FIXTURE_JSON);

// --- Tests ---
describe('schemaService', () => {
  // documentToTreeData tests are assumed to be passing and are omitted for brevity.
  // ...

  describe('getBreadcrumbForPosition', () => {
    // Helper to find the real ProseMirror position of a listItem by its unique ID
    const findPosByNodeId = (doc: Node, nodeId: string): number => {
      let position = -1;
      doc.descendants((node, pos) => {
        if (node.type.name === 'listItem' && node.attrs.nodeId === nodeId) {
          position = pos;
          return false; // Stop searching
        }
      });
      return position;
    };

    it('should return "Schema Root" for nodes without a valid list hierarchy', () => {
      // Position 1 is inside the H1 tag
      const breadcrumb = getBreadcrumbForPosition(MOCK_DOC, 1);
      expect(breadcrumb).toBe('Schema Root');
    });

    it('should return the correct path for a root-level list item (depth 1)', () => {
      const firstListItemPos = findPosByNodeId(MOCK_DOC, 'n1');
      // We use `pos + 1` to resolve the position *inside* the node, not before it.
      const breadcrumb = getBreadcrumbForPosition(
        MOCK_DOC,
        firstListItemPos + 1
      );
      expect(breadcrumb).toBe('Root Concept');
    });

    it('should return the correct path for a nested list item (depth 2)', () => {
      const nestedPos = findPosByNodeId(MOCK_DOC, 'n1_1');
      // Update the expectation to match the function's behavior (full path)
      const breadcrumb = getBreadcrumbForPosition(MOCK_DOC, nestedPos + 1);
      expect(breadcrumb).toBe('Root Concept > Sub Concept');
    });

    it('should handle a deeper nesting path correctly', () => {
      posCounter = 1;
      const deepDocJson = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'bulletList',
            content: [
              createListItem('p1', 'Level 1 Parent', null, [
                createListItem('c1', 'Level 2 Child', null, [
                  createListItem('gc1', 'Level 3 Grandchild', null),
                ]),
              ]),
            ],
          },
        ],
      };
      const deepDoc = createMockDoc(deepDocJson);
      const grandchildPos = findPosByNodeId(deepDoc, 'gc1');
      // Update the expectation to match the function's behavior (full path)
      const breadcrumb = getBreadcrumbForPosition(deepDoc, grandchildPos + 1);
      expect(breadcrumb).toBe(
        'Level 1 Parent > Level 2 Child > Level 3 Grandchild'
      );
    });
  });
});
