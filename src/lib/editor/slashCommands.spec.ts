/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { writable, type Writable } from 'svelte/store';
import type { Editor, Range } from '@tiptap/core';
import type { Mock } from 'vitest';
import type { EditorStoreState } from '$lib/stores/editorStore';

// --- Step 1: Store the promise from the async vi.hoisted block ---
const mocksPromise = vi.hoisted(async () => {
  const { writable } = await import('svelte/store');
  const mockEditorStore = writable<Partial<EditorStoreState>>({
    selectedNodePos: null,
  });
  return {
    mockModalStore: { open: vi.fn() },
    mockCommandBarStore: { openAiHelper: vi.fn() },
    mockTtsStore: { startReadingFromNode: vi.fn() },
    mockCardEditorStore: { open: vi.fn() },
    mockToast: { error: vi.fn() },
    mockEditorStore,
  };
});

// --- Mock dependencies using the promise's eventual values ---
// Vitest's mock factories will close over these variables and see their updated values at runtime.
let mockModalStore: { open: Mock };
let mockCommandBarStore: { openAiHelper: Mock };
let mockEditorStore: Writable<Partial<EditorStoreState>>;
let mockTtsStore: { startReadingFromNode: Mock };
let mockCardEditorStore: { open: Mock };
let mockToast: { error: Mock };

vi.mock('$lib/stores/modalStore', () => ({
  get modalStore() {
    return mockModalStore;
  },
}));
vi.mock('$lib/stores/commandBarStore', () => ({
  get commandBarStore() {
    return mockCommandBarStore;
  },
}));
vi.mock('$lib/stores/editorStore', () => ({
  get editorStore() {
    return mockEditorStore;
  },
}));
vi.mock('$lib/stores/ttsStore', () => ({
  get ttsStore() {
    return mockTtsStore;
  },
}));
vi.mock('$lib/stores/cardEditorStore', () => ({
  get cardEditorStore() {
    return mockCardEditorStore;
  },
}));
vi.mock('svelte-sonner', () => ({
  get toast() {
    return mockToast;
  },
}));
vi.mock('$lib/utils/i18n', () => ({
  gett: vi.fn(() => (key: string) => key),
}));

// --- Import the module to test AFTER all mocks are set up ---
import { getCommands } from './slashCommands';

// --- Test Suite ---
const createMockEditor = () => {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    deleteRange: vi.fn().mockReturnThis(),
    setNode: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    setMark: vi.fn().mockReturnThis(),
    insertContentAt: vi.fn().mockReturnThis(),
    run: vi.fn(() => true),
  };
  return {
    chain: vi.fn(() => chain),
    state: {
      doc: {
        nodeAt: vi.fn(),
      },
    },
  } as unknown as Editor;
};

describe('slashCommands', () => {
  // --- Step 2: Use beforeAll to await the promise and populate the mock variables ---
  beforeAll(async () => {
    const awaitedMocks = await mocksPromise;
    mockModalStore = awaitedMocks.mockModalStore;
    mockCommandBarStore = awaitedMocks.mockCommandBarStore;
    mockEditorStore = awaitedMocks.mockEditorStore;
    mockTtsStore = awaitedMocks.mockTtsStore;
    mockCardEditorStore = awaitedMocks.mockCardEditorStore;
    mockToast = awaitedMocks.mockToast;
  });

  let mockEditor: Editor;
  const mockRange: Range = { from: 5, to: 6 };
  const commands = getCommands();

  const findCommand = (titleKey: string) => {
    const command = commands.find((cmd) => cmd.title === titleKey);
    expect(
      command,
      `Command with title key "${titleKey}" not found`
    ).toBeDefined();
    return command!;
  };

  beforeEach(() => {
    mockEditor = createMockEditor();
    vi.clearAllMocks();
    // This will now work because mockEditorStore is guaranteed to be initialized
    mockEditorStore.set({ selectedNodePos: null });
  });

  describe('getCommands', () => {
    it('should return a list of commands with the correct structure', () => {
      const commands = getCommands();
      expect(commands).toBeInstanceOf(Array);
      expect(commands.length).toBeGreaterThan(0);

      commands.forEach((command) => {
        expect(command).toHaveProperty('title');
        expect(command).toHaveProperty('description');
        expect(command).toHaveProperty('group');
        expect(command).toHaveProperty('icon');
        expect(command).toHaveProperty('command');
        expect(typeof command.command).toBe('function');
      });
    });
  });

  describe('Formatting Commands', () => {
    it('should execute "Heading 1" command correctly', () => {
      const command = findCommand('slashCommands.h1.title');
      command.command({ editor: mockEditor, range: mockRange });
      const chain = mockEditor.chain();
      expect(chain.focus).toHaveBeenCalledOnce();
      expect(chain.deleteRange).toHaveBeenCalledWith(mockRange);
      expect(chain.setNode).toHaveBeenCalledWith('heading', { level: 1 });
      expect(chain.run).toHaveBeenCalledOnce();
    });

    it('should execute "Bulleted List" command correctly', () => {
      const command = findCommand('slashCommands.list.title');
      command.command({ editor: mockEditor, range: mockRange });
      expect(mockEditor.chain().toggleBulletList).toHaveBeenCalledOnce();
    });
  });

  describe('Media Commands', () => {
    it('should execute "Image" command and open the media modal', () => {
      const mockNode = { attrs: { src: null } };
      (mockEditor.state.doc.nodeAt as Mock).mockReturnValue(mockNode);
      const command = findCommand('slashCommands.image.title');
      command.command({ editor: mockEditor, range: mockRange });
      const chain = mockEditor.chain();
      expect(chain.deleteRange).toHaveBeenCalledWith(mockRange);
      expect(chain.insertContentAt).toHaveBeenCalledWith(mockRange.from, {
        type: 'image',
        attrs: { src: null },
      });
      expect(mockModalStore.open).toHaveBeenCalledOnce();
      expect(mockModalStore.open).toHaveBeenCalledWith({
        type: 'media',
        nodeType: 'image',
        nodePos: mockRange.from,
        attrs: mockNode.attrs,
      });
    });
  });

  describe('AI Commands (Conditional Logic)', () => {
    it('should open AI helper for "Expand Node" if a node is selected', () => {
      mockEditorStore.set({ selectedNodePos: 10 });
      const command = findCommand('slashCommands.expandNode.title');
      command.command({ editor: mockEditor, range: mockRange });
      expect(mockCommandBarStore.openAiHelper).toHaveBeenCalledOnce();
      expect(mockCommandBarStore.openAiHelper).toHaveBeenCalledWith(
        'expand-node'
      );
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('should show an error for "Expand Node" if no node is selected', () => {
      mockEditorStore.set({ selectedNodePos: null });
      const command = findCommand('slashCommands.expandNode.title');
      command.command({ editor: mockEditor, range: mockRange });
      expect(mockToast.error).toHaveBeenCalledOnce();
      expect(mockToast.error).toHaveBeenCalledWith(
        'slashCommands.expandNode.error'
      );
      expect(mockCommandBarStore.openAiHelper).not.toHaveBeenCalled();
    });
  });

  describe('Utility Commands (Conditional Logic)', () => {
    it('should open card editor for "Edit Cards" if node has a nodeId', () => {
      const nodeId = 'test-node-123';
      mockEditorStore.set({ selectedNodePos: 10 });
      (mockEditor.state.doc.nodeAt as Mock).mockReturnValue({
        attrs: { nodeId },
      });
      const command = findCommand('slashCommands.editCards.title');
      command.command({ editor: mockEditor, range: mockRange });
      expect(mockCardEditorStore.open).toHaveBeenCalledOnce();
      expect(mockCardEditorStore.open).toHaveBeenCalledWith(nodeId);
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('should show an error for "Edit Cards" if the selected node has no nodeId', () => {
      mockEditorStore.set({ selectedNodePos: 10 });
      (mockEditor.state.doc.nodeAt as Mock).mockReturnValue({
        attrs: {},
      });
      const command = findCommand('slashCommands.editCards.title');
      command.command({ editor: mockEditor, range: mockRange });
      expect(mockToast.error).toHaveBeenCalledOnce();
      expect(mockToast.error).toHaveBeenCalledWith(
        'slashCommands.editCards.errorNoId'
      );
      expect(mockCardEditorStore.open).not.toHaveBeenCalled();
    });
  });
});
