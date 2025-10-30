/**
 * @file Manages the state and operations for offline document audio.
 * This store handles audio generation directly on the client-side
 * using the Edge-TTS library, following its correct async workflow.
 * @module offlineStore
 */

import { writable, get } from 'svelte/store';
import { documentStore } from './documentStore';
import { editorStore } from './editorStore';
import { getReadableNodes, type ReadableNode } from '$lib/utils/ttsUtils';
import { saveAudio, deleteAudioForDoc } from '$lib/services/core/db.service';
import { toast } from 'svelte-sonner';
import { t } from '$lib/utils/i18n';
import * as errorService from '$lib/services/core/errorService';

// Import the TTS library and the Buffer polyfill.
import { EdgeTTS } from '@andresaya/edge-tts';
import { Buffer } from 'buffer';

// --- TYPES AND CONFIGURATION ---

async function hashText(text: string): Promise<string> {
  if (!crypto?.subtle?.digest) {
    console.warn(
      'Web Crypto API (crypto.subtle) is not available. Falling back to timestamp for versioning.'
    );
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
  downloadProgress: number;
  downloadedDocs: Record<string, OfflineDocInfo>;
}

const OFFLINE_DOCS_KEY = 'schemas-work-offline-docs';
const AUDIO_FORMAT = 'webm-24khz-16bit-mono-opus';

function createOfflineStore() {
  const initialState: OfflineState = {
    status: 'idle',
    downloadProgress: 0,
    downloadedDocs: JSON.parse(localStorage.getItem(OFFLINE_DOCS_KEY) || '{}'),
  };

  const store = writable<OfflineState>(initialState);
  const { subscribe, update } = store;

  let downloadAbortController: AbortController | null = null;

  subscribe((state) => {
    localStorage.setItem(
      OFFLINE_DOCS_KEY,
      JSON.stringify(state.downloadedDocs)
    );
  });

  // --- PRIVATE HELPERS ---

  /**
   * The core download loop, running in the browser.
   * This is the correct workflow based on the library's type definitions.
   */
  async function _performClientSideDownloadLoop(
    docId: string,
    voiceId: string,
    nodes: ReadableNode[],
    signal: AbortSignal,
    onProgress: (progress: number) => void
  ): Promise<void> {
    await deleteAudioForDoc(docId);

    const tts = new EdgeTTS();
    (tts as any).audioFormat = AUDIO_FORMAT;

    for (const [index, node] of nodes.entries()) {
      signal.throwIfAborted();

      const audioId = `${docId}_${index}`;
      console.log(
        `[OfflineStore] Generating audio for chunk ${index + 1}/${nodes.length}...`
      );

      try {
        // 1. Llama a synthesize y espera a que termine. Esto llena el búfer interno de 'tts'.
        await tts.synthesize(node.textToSpeak, voiceId);

        // 2. Después de que termine, extrae los datos del búfer interno.
        const audioBuffer = tts.toBuffer();

        // 3. Convierte el Buffer en un Blob para guardarlo.
        const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

        if (audioBlob.size > 0) {
          await saveAudio(audioId, audioBlob);
        } else {
          throw new Error('Synthesized audio is empty.');
        }
      } catch (error) {
        // Re-lanza el error para que sea capturado por el bloque catch principal.
        const err = error instanceof Error ? error : new Error(String(error));
        throw new Error(
          `Failed to synthesize audio for chunk ${index + 1}: ${err.message}`
        );
      }

      onProgress(((index + 1) / nodes.length) * 100);
    }
  }

  // --- PUBLIC STORE METHODS ---
  const publicMethods = {
    subscribe,

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
        await _performClientSideDownloadLoop(
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
        if (err.name !== 'AbortError') {
          errorService.reportError(err, {
            operation: 'offline.download.client',
          });
          toast.error(get(t)('offline.download_failed'));
        } else {
          toast.info(get(t)('offline.download_cancelled'));
        }
        update((s) => ({ ...s, status: 'idle', downloadProgress: 0 }));
      } finally {
        downloadAbortController = null;
      }
    },

    cancelDownload(): void {
      if (downloadAbortController) {
        downloadAbortController.abort();
        console.log('Download cancellation requested.');
      }
    },

    async deleteOfflineDocument(docId: string): Promise<void> {
      await deleteAudioForDoc(docId);
      update((s) => {
        const newDownloadedDocs = { ...s.downloadedDocs };
        delete newDownloadedDocs[docId];
        return { ...s, downloadedDocs: newDownloadedDocs };
      });
      toast.success(get(t)('offline.deleted'));
    },

    async getDocStatus(docId: string | null): Promise<OfflineDocStatus> {
      if (!docId) return 'not_downloaded';
      const state = get(store);

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
      if (!editor) return 'downloaded';

      const currentVersionHash = await hashText(editor.state.doc.textContent);
      return currentVersionHash === docInfo.versionHash
        ? 'downloaded'
        : 'outdated';
    },
  };

  return publicMethods;
}

export const offlineStore = createOfflineStore();
