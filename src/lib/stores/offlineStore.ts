// src/lib/stores/offlineStore.ts

import { writable, get } from 'svelte/store';
import { documentStore } from './documentStore';
import { editorStore } from './editorStore';
import { getReadableNodes, type ReadableNode } from '$lib/utils/ttsUtils';
import { saveAudio, deleteAudioForDoc } from '$lib/services/core/db.service';
import { fetchAudioForText } from '$lib/services/tts/ttsApiService'; // Import our new service
import { toast } from 'svelte-sonner';
import { t } from '$lib/utils/i18n';
import * as errorService from '$lib/services/core/errorService';

// --- TYPES AND CONFIGURATION ---

/**
 * Creates a SHA-1 hash of a string for content versioning.
 * Falls back to a unique timestamp if the Web Crypto API is unavailable (insecure context).
 * @param text The string to hash.
 * @returns A promise that resolves to the hex string of the hash or a unique string.
 */
async function hashText(text: string): Promise<string> {
  // Check if the crypto API is available in this context.
  if (!crypto?.subtle?.digest) {
    console.warn(
      'Web Crypto API (crypto.subtle) is not available. This is expected on non-HTTPS origins (excluding localhost). Falling back to a timestamp for versioning. Offline status checks may be less reliable.'
    );
    // Return a value that will always be unique, forcing an "outdated" status.
    return `insecure_context_${Date.now()}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type OfflineDocStatus =
  | 'not_downloaded'
  | 'downloaded'
  | 'outdated'
  | 'downloading';

export interface OfflineDocInfo {
  id: string;
  versionHash: string;
  chunkCount: number;
  downloadedAt: number;
}

export interface OfflineState {
  status: 'idle' | 'downloading';
  downloadProgress: number; // 0-100
  downloadedDocs: Record<string, OfflineDocInfo>; // A map of docId to its offline info
}

const OFFLINE_DOCS_KEY = 'schemas-work-offline-docs';

/**
 * Creates the offline store with encapsulated logic for downloading and managing documents.
 */
function createOfflineStore() {
  const initialState: OfflineState = {
    status: 'idle',
    downloadProgress: 0,
    downloadedDocs: JSON.parse(localStorage.getItem(OFFLINE_DOCS_KEY) || '{}'),
  };

  const store = writable<OfflineState>(initialState);
  const { subscribe, update } = store;

  // A controller to manage the cancellation of in-progress downloads.
  let downloadAbortController: AbortController | null = null;

  // Persist changes to downloadedDocs in localStorage whenever the store updates.
  subscribe((state) => {
    localStorage.setItem(
      OFFLINE_DOCS_KEY,
      JSON.stringify(state.downloadedDocs)
    );
  });

  // --- PRIVATE HELPERS ---

  /** The core download loop. Decoupled from state management. */
  async function _performDownloadLoop(
    docId: string,
    voiceId: string,
    nodes: ReadableNode[],
    signal: AbortSignal,
    onProgress: (progress: number) => void
  ): Promise<void> {
    // First, clear any old audio data for this document to ensure consistency.
    await deleteAudioForDoc(docId);

    for (const [index, node] of nodes.entries()) {
      // Check for cancellation before each network request. Throws if aborted.
      signal.throwIfAborted();

      const audioId = `${docId}_${index}`;
      const audioBlob = await fetchAudioForText(
        node.textToSpeak,
        voiceId,
        signal
      );
      await saveAudio(audioId, audioBlob);

      onProgress(((index + 1) / nodes.length) * 100);
    }
  }

  // --- PUBLIC STORE METHODS ---
  const publicMethods = {
    subscribe,

    /**
     * Downloads all readable nodes of a document as audio chunks for offline playback.
     */
    async downloadDocument(docId: string, voiceId: string): Promise<void> {
      if (get(store).status === 'downloading') {
        console.warn('Download already in progress.');
        return;
      }

      const editor = get(editorStore).instance;
      if (!editor) {
        toast.error(get(t)('common.editor_not_ready'));
        return;
      }

      const nodes = getReadableNodes(editor);
      if (nodes.length === 0) {
        toast.info(get(t)('tts.no_readable_content_toast'));
        return;
      }

      downloadAbortController = new AbortController();
      update((s) => ({ ...s, status: 'downloading', downloadProgress: 0 }));
      toast.info(get(t)('offline.download_started'));

      try {
        await _performDownloadLoop(
          docId,
          voiceId,
          nodes,
          downloadAbortController.signal,
          (progress) => update((s) => ({ ...s, downloadProgress: progress }))
        );

        const currentVersionHash = await hashText(editor.state.doc.textContent);

        update((s) => {
          const newDocInfo: OfflineDocInfo = {
            id: docId,
            versionHash: currentVersionHash,
            chunkCount: nodes.length,
            downloadedAt: Date.now(),
          };
          return {
            ...s,
            status: 'idle',
            downloadProgress: 100,
            downloadedDocs: { ...s.downloadedDocs, [docId]: newDocInfo },
          };
        });
        toast.success(get(t)('offline.download_complete'));
      } catch (error) {
        const err = error as Error;
        // Don't show an error toast if the user intentionally cancelled.
        if (err.name !== 'AbortError') {
          errorService.reportError(err, { operation: 'offline.download' });
          toast.error(get(t)('offline.download_failed'));
        } else {
          toast.info(get(t)('offline.download_cancelled'));
        }
        update((s) => ({ ...s, status: 'idle', downloadProgress: 0 }));
      } finally {
        downloadAbortController = null;
      }
    },

    /** Cancels any download that is currently in progress. */
    cancelDownload(): void {
      if (downloadAbortController) {
        downloadAbortController.abort();
        console.log('Download cancellation requested.');
      }
    },

    /** Deletes all local audio chunks and metadata for a document. */
    async deleteOfflineDocument(docId: string): Promise<void> {
      await deleteAudioForDoc(docId);
      update((s) => {
        const newDownloadedDocs = { ...s.downloadedDocs };
        delete newDownloadedDocs[docId];
        return { ...s, downloadedDocs: newDownloadedDocs };
      });
      toast.success(get(t)('offline.deleted'));
    },

    /**
     * Checks the offline status of a document by comparing its current content
     * hash with the stored hash.
     */
    async getDocStatus(docId: string | null): Promise<OfflineDocStatus> {
      if (!docId) return 'not_downloaded';
      const state = get(store);

      // If this specific doc is the one being downloaded, report it.
      if (
        state.status === 'downloading' &&
        get(documentStore).docId === docId
      ) {
        return 'downloading';
      }

      const docInfo = state.downloadedDocs[docId];
      if (!docInfo) {
        return 'not_downloaded';
      }

      const editor = get(editorStore).instance;
      if (!editor) return 'downloaded'; // Cannot verify, assume it's fine.

      const currentVersionHash = await hashText(editor.state.doc.textContent);
      return currentVersionHash === docInfo.versionHash
        ? 'downloaded'
        : 'outdated';
    },
  };

  return publicMethods;
}

export const offlineStore = createOfflineStore();
