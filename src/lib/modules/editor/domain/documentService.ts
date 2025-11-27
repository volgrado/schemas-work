/**
 * @file documentService.ts
 * @module editor.domain
 * @description
 * Encapsulates the business logic for managing document lifecycles.
 * Handles loading, creating, and updating document metadata and persistence providers.
 */

import { fileSystemStore } from '$lib/modules/file-system';
import { getDocumentProvider } from '$lib/core/services/persistenceService';
import { i18n } from '$lib/utils/i18n.svelte';
import type { SchemaMetadata } from '$lib/types';
import type { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

export interface LoadedDocument {
  metadata: SchemaMetadata;
  ydoc: Y.Doc;
  provider: IndexeddbPersistence;
}

export class DocumentService {
  /**
   * Loads a document by ID, ensuring the persistence provider is synced.
   */
  static async loadDocument(docId: string): Promise<LoadedDocument> {
    console.log(`[DocumentService] Loading metadata for docId: ${docId}`);
    const metadata = fileSystemStore.getItem(docId);

    if (!metadata || metadata.type !== 'schema') {
      throw new Error(i18n.t('document.invalid_document_error', { docId }));
    }

    console.log(`[DocumentService] Metadata loaded. Getting provider...`);
    const { ydoc, provider } = getDocumentProvider(docId);

    // Wait for sync with timeout
    const SYNC_TIMEOUT = 5000;
    const syncPromise = provider.whenSynced;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Document sync timed out')),
        SYNC_TIMEOUT
      )
    );

    await Promise.race([syncPromise, timeoutPromise]);
    console.log(`[DocumentService] Provider synced.`);

    await fileSystemStore.setLastActiveDocId(docId);

    return { metadata, ydoc, provider };
  }

  /**
   * Creates a new document with optional initial content.
   */
  static async createDocument(
    title: string,
    parentId: string | null = null
  ): Promise<LoadedDocument> {
    const newMetadata = await fileSystemStore.createSchema(title, parentId);
    const { ydoc, provider } = getDocumentProvider(newMetadata.id);

    await provider.whenSynced;
    await fileSystemStore.setLastActiveDocId(newMetadata.id);

    return { metadata: newMetadata, ydoc, provider };
  }

  /**
   * Updates the title of a document in the file system.
   */
  static async updateDocumentTitle(
    docId: string,
    newTitle: string
  ): Promise<void> {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    await fileSystemStore.updateItem(docId, { title: trimmedTitle });
  }
}
