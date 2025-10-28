// src/lib/stores/offlineStore.ts

import { writable, get } from 'svelte/store';
import { documentStore } from './documentStore';
import { editorStore } from './editorStore';
// CORRECCIÓN 1: Importamos 'getReadableNodes' directamente del módulo 'ttsStore'
import { getReadableNodes } from './ttsStore';
import { saveAudio, deleteAudioForDoc } from '$lib/services/core/db.service';
import { toast } from 'svelte-sonner';
import { t } from '$lib/utils/i18n';

// --- TIPOS Y CONFIGURACIÓN ---

// Usamos un hash del contenido para detectar cambios en el documento.
async function hashText(text: string): Promise<string> {
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
  downloadedDocs: Record<string, OfflineDocInfo>; // Un mapa de docId a su información offline
}

const OFFLINE_DOCS_KEY = 'schemas-work-offline-docs';

function getInitialState(): OfflineState {
  const stored = localStorage.getItem(OFFLINE_DOCS_KEY);
  return {
    status: 'idle',
    downloadProgress: 0,
    downloadedDocs: stored ? JSON.parse(stored) : {},
  };
}

const store = writable<OfflineState>(getInitialState());
const { subscribe, update, set } = store;

// Guardar en localStorage cada vez que cambie el estado de los documentos descargados
subscribe((state) => {
  localStorage.setItem(OFFLINE_DOCS_KEY, JSON.stringify(state.downloadedDocs));
});

// --- FUNCIONES PÚBLICAS ---

async function downloadDocument(docId: string, voiceId: string): Promise<void> {
  const editor = get(editorStore).instance;
  if (!editor || get(store).status === 'downloading') return;

  update((s) => ({ ...s, status: 'downloading', downloadProgress: 0 }));
  toast.info(get(t)('offline.download_started'));

  try {
    // CORRECCIÓN 2: Llamamos a getReadableNodes directamente.
    const nodes = getReadableNodes(editor);

    if (nodes.length === 0) {
      throw new Error('Document has no readable content to download.');
    }

    // Primero, borramos cualquier versión antigua para evitar inconsistencias
    await deleteAudioForDoc(docId);

    for (const [index, node] of nodes.entries()) {
      const audioId = `${docId}_${index}`;
      const encodedText = encodeURIComponent(node.textToSpeak);
      const response = await fetch(
        `/api/tts?text=${encodedText}&voice=${voiceId}`
      );
      if (!response.ok)
        throw new Error(`Failed to fetch audio for chunk ${index + 1}`);
      const audioBlob = await response.blob();
      await saveAudio(audioId, audioBlob);

      // Actualizar el progreso
      update((s) => ({
        ...s,
        downloadProgress: ((index + 1) / nodes.length) * 100,
      }));
    }

    const currentVersionHash = await hashText(editor.state.doc.textContent);

    update((s) => {
      const newDownloadedDocs = { ...s.downloadedDocs };
      newDownloadedDocs[docId] = {
        id: docId,
        versionHash: currentVersionHash,
        chunkCount: nodes.length,
        downloadedAt: Date.now(),
      };
      return {
        ...s,
        status: 'idle',
        downloadProgress: 100,
        downloadedDocs: newDownloadedDocs,
      };
    });

    toast.success(get(t)('offline.download_complete'));
  } catch (error) {
    console.error('Download failed:', error);
    toast.error(get(t)('offline.download_failed'));
    update((s) => ({ ...s, status: 'idle', downloadProgress: 0 }));
  }
}

async function deleteOfflineDocument(docId: string): Promise<void> {
  await deleteAudioForDoc(docId);
  update((s) => {
    const newDownloadedDocs = { ...s.downloadedDocs };
    delete newDownloadedDocs[docId];
    return { ...s, downloadedDocs: newDownloadedDocs };
  });
  toast.success(get(t)('offline.deleted'));
}

async function getDocStatus(docId: string | null): Promise<OfflineDocStatus> {
  if (!docId) return 'not_downloaded';
  const state = get(store);

  if (state.status === 'downloading' && get(documentStore).docId === docId) {
    return 'downloading';
  }

  const docInfo = state.downloadedDocs[docId];
  if (!docInfo) {
    return 'not_downloaded';
  }

  const editor = get(editorStore).instance;
  if (!editor) return 'downloaded'; // No podemos verificar si no hay editor

  const currentVersionHash = await hashText(editor.state.doc.textContent);

  return currentVersionHash === docInfo.versionHash ? 'downloaded' : 'outdated';
}

export const offlineStore = {
  subscribe,
  downloadDocument,
  deleteOfflineDocument,
  getDocStatus,
};
