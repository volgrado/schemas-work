// src/lib/stores/documentStore.spec.ts
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writable, get } from 'svelte/store';
import type { SchemaMetadata } from '$lib/types';

// --- TYPE DEFINITIONS for DYNAMIC IMPORTS ---
// This pattern provides type safety for dynamically imported modules.
type DocumentStoreModule = typeof import('./documentStore');
type DirectoryServiceModule =
  typeof import('$lib/services/core/directoryService');

// --- MOCK DEPENDENCIES ---
const mockProvider = {
  whenSynced: Promise.resolve(),
  destroy: vi.fn(),
};
vi.mock('$lib/services/core/persistenceService', () => ({
  getDocumentProvider: vi.fn(() => ({
    ydoc: { isYDoc: true },
    provider: mockProvider,
  })),
}));

const directoryEventsController = writable<any>(null); // `any` allows flexible test events
vi.mock('$lib/services/core/directoryService', () => ({
  directoryEvents: directoryEventsController,
  setLastActiveDocId: vi.fn(),
  updateItemMetadata: vi.fn(),
  createSchema: vi.fn(),
  getItemById: vi.fn(),
  getAllItems: vi.fn(),
}));

vi.mock('$lib/services/core/errorService', () => ({
  reportError: vi.fn(),
}));

const mockEditorInstance = {
  chain: vi.fn(() => ({
    focus: vi.fn().mockReturnThis(),
    setTextSelection: vi.fn().mockReturnThis(),
    insertContent: vi.fn().mockReturnThis(),
    insertContentAt: vi.fn().mockReturnThis(),
    run: vi.fn(),
  })),
  state: {
    doc: {
      firstChild: {
        type: { name: 'heading' },
        attrs: { level: 1 },
        content: { size: 10 }, // This property is required by the store's logic
        textContent: 'Old Title',
      },
    },
  },
};
vi.mock('$lib/stores/editorStore', () => ({
  editorStore: writable({ instance: mockEditorInstance }),
}));

vi.mock('$lib/utils/i18n', () => ({
  t: writable((key: string) => `[i18n:${key}]`),
}));

// --- TESTS ---
describe('documentStore', () => {
  let documentStore: DocumentStoreModule['documentStore'];
  let directoryService: DirectoryServiceModule;

  const MOCK_DOC_ID = 'test-doc-id-123';
  const MOCK_METADATA: SchemaMetadata = {
    id: MOCK_DOC_ID,
    title: 'Initial Document Title',
    type: 'schema',
    createdAt: 0,
    updatedAt: 0,
    parentId: null,
  };

  // Using vi.resetModules() and dynamic import() is the definitive pattern
  // for testing singleton Svelte stores to ensure complete test isolation.
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    directoryService = await import('$lib/services/core/directoryService');
    const storeModule = await import('./documentStore');
    documentStore = storeModule.documentStore;

    // Set up default successful mock resolutions for each test
    vi.mocked(directoryService.getItemById).mockResolvedValue(MOCK_METADATA);
    vi.mocked(directoryService.createSchema).mockResolvedValue(MOCK_METADATA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadDocument', () => {
    it('should set status to loading, wait for sync, and set status to ready', async () => {
      documentStore.loadDocument(MOCK_DOC_ID);
      expect(get(documentStore).status).toBe('loading');
      await vi.runAllTimersAsync();
      const state = get(documentStore);
      expect(state.status).toBe('ready');
      expect(state.docId).toBe(MOCK_DOC_ID);
    });

    it('should destroy previous provider before loading a new document', async () => {
      documentStore.loadDocument('doc-a');
      await vi.runAllTimersAsync();
      documentStore.loadDocument('doc-b');
      await vi.runAllTimersAsync();
      expect(mockProvider.destroy).toHaveBeenCalledTimes(1);
    });

    it('should set status to error if document metadata is not found', async () => {
      vi.mocked(directoryService.getItemById).mockResolvedValue(undefined);
      documentStore.loadDocument(MOCK_DOC_ID);
      await vi.runAllTimersAsync();
      expect(get(documentStore).status).toBe('error');
    });
  });

  describe('createNewDocument', () => {
    it('should create schema, set default content, and set status to ready', async () => {
      const newMetadata = { ...MOCK_METADATA, title: 'My New Schema' };
      vi.mocked(directoryService.createSchema).mockResolvedValue(newMetadata);

      await documentStore.createNewDocument(newMetadata.title);

      expect(directoryService.createSchema).toHaveBeenCalledWith(
        newMetadata.title,
        null
      );
      const state = get(documentStore);
      expect(state.status).toBe('ready');
      expect(state.initialContent).toBeDefined();
    });

    it('should use provided content instead of default content', async () => {
      const aiContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'AI Content' }],
          },
        ],
      };
      await documentStore.createNewDocument('AI Draft', aiContent);
      expect(get(documentStore).initialContent).toEqual(aiContent);
    });
  });

  describe('updateTitle', () => {
    it('should optimistically update local state and then call directoryService', async () => {
      documentStore.loadDocument(MOCK_DOC_ID);
      await vi.runAllTimersAsync();

      documentStore.updateTitle('New Local Title');
      expect(get(documentStore).metadata?.title).toBe('New Local Title');

      await vi.runAllTimersAsync();
      expect(directoryService.updateItemMetadata).toHaveBeenCalledWith(
        MOCK_DOC_ID,
        { title: 'New Local Title' }
      );
    });

    it('should revert the title if the directoryService call fails', async () => {
      documentStore.loadDocument(MOCK_DOC_ID);
      await vi.runAllTimersAsync();

      vi.mocked(directoryService.updateItemMetadata).mockRejectedValue(
        new Error('Save failed')
      );

      documentStore.updateTitle('Failing Update');
      await vi.runAllTimersAsync();

      expect(get(documentStore).metadata?.title).toBe('Initial Document Title');
    });
  });

  describe('directoryEvents subscription', () => {
    it('should update metadata if the current document is updated', async () => {
      documentStore.loadDocument(MOCK_DOC_ID);
      await vi.runAllTimersAsync();
      const updatedMetadata = { ...MOCK_METADATA, title: 'External Rename' };

      directoryEventsController.set({ type: 'updated', item: updatedMetadata });
      await vi.runAllTimersAsync();

      expect(get(documentStore).metadata?.title).toBe('External Rename');
    });

    it('should load a replacement if the current document is deleted', async () => {
      documentStore.loadDocument(MOCK_DOC_ID);
      await vi.runAllTimersAsync();

      const replacementDoc = { ...MOCK_METADATA, id: 'replacement-doc' };
      vi.mocked(directoryService.getAllItems).mockResolvedValue([
        replacementDoc,
      ]);
      vi.mocked(directoryService.getItemById).mockResolvedValue(replacementDoc);

      directoryEventsController.set({ type: 'deleted', item: MOCK_METADATA });
      await vi.runAllTimersAsync();

      expect(get(documentStore).docId).toBe('replacement-doc');
    });

    it('should create a new document if the deleted doc was the last one', async () => {
      documentStore.loadDocument(MOCK_DOC_ID);
      await vi.runAllTimersAsync();

      vi.mocked(directoryService.getAllItems).mockResolvedValue([]);
      const newDocMeta = { ...MOCK_METADATA, id: 'new-doc-from-delete' };
      vi.mocked(directoryService.createSchema).mockResolvedValue(newDocMeta);

      directoryEventsController.set({ type: 'deleted', item: MOCK_METADATA });
      await vi.runAllTimersAsync();

      expect(directoryService.createSchema).toHaveBeenCalledWith(
        '[i18n:document.first_schema_title]',
        null // Ensures the default parentId is passed
      );
      expect(get(documentStore).docId).toBe('new-doc-from-delete');
    });
  });
});
