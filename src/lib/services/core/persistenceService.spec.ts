/**
 * @vitest-environment jsdom
 */
// FIX: Corrected the syntax for the type-only import
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// --- MOCK DEPENDENCIES ---
// 1. Mock the entire modules. Vitest hoists this.
vi.mock('yjs', () => ({ Doc: vi.fn() }));
vi.mock('y-indexeddb', () => ({ IndexeddbPersistence: vi.fn() }));

// 2. Import the mocked classes *after* the mocks are defined.
import { Doc as MockYDoc } from 'yjs';
import { IndexeddbPersistence as MockIndexeddbPersistence } from 'y-indexeddb';
import { getDocumentProvider } from './persistenceService';

describe('persistenceService', () => {
  beforeEach(() => {
    // Clear call history and instances from the mock constructors
    vi.clearAllMocks();
  });

  it('should create a new Y.Doc and a persistence provider', () => {
    getDocumentProvider('test-doc-id');

    // Verify that both constructors were called exactly once.
    expect(MockYDoc).toHaveBeenCalledTimes(1);
    expect(MockIndexeddbPersistence).toHaveBeenCalledTimes(1);
  });

  it('should wire the new Y.Doc instance to the persistence provider correctly', () => {
    const TEST_DOC_ID = 'document-123';
    getDocumentProvider(TEST_DOC_ID);

    // This is the most crucial assertion.
    // It verifies that the persistence provider was initialized with:
    // 1. The correct document ID.
    // 2. The *exact same Y.Doc instance* that was just created.
    const newYDocInstance = (MockYDoc as Mock).mock.instances[0];
    expect(MockIndexeddbPersistence).toHaveBeenCalledWith(
      TEST_DOC_ID,
      newYDocInstance
    );
  });

  it('should return an object containing the newly created instances', () => {
    const result = getDocumentProvider('doc-456');

    // Get a handle to the actual instances created by the mocks
    const newYDocInstance = (MockYDoc as Mock).mock.instances[0];
    const newProviderInstance = (MockIndexeddbPersistence as Mock).mock
      .instances[0];

    // Assert that the returned object contains these exact instances
    expect(result.ydoc).toBe(newYDocInstance);
    expect(result.provider).toBe(newProviderInstance);
  });
});
