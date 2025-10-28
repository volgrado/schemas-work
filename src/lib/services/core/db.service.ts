// src/lib/services/core/db.service.ts

import { openDB, type DBSchema } from 'idb';

const DB_NAME = 'schemas-work-db';
const DB_VERSION = 1;
const AUDIO_STORE_NAME = 'audio-cache';

interface AppDB extends DBSchema {
  [AUDIO_STORE_NAME]: {
    key: string; // Será algo como 'docId_chunkIndex'
    value: Blob; // El archivo de audio MP3
  };
}

const dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore(AUDIO_STORE_NAME);
  },
});

export async function saveAudio(id: string, audioBlob: Blob): Promise<void> {
  const db = await dbPromise;
  await db.put(AUDIO_STORE_NAME, audioBlob, id);
}

export async function getAudio(id: string): Promise<Blob | undefined> {
  const db = await dbPromise;
  return db.get(AUDIO_STORE_NAME, id);
}

export async function deleteAudio(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete(AUDIO_STORE_NAME, id);
}

// En db.service.ts, al final del archivo

export async function deleteAudioForDoc(docId: string): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(AUDIO_STORE_NAME, 'readwrite');
  let cursor = await tx.store.openCursor();
  while (cursor) {
    if (cursor.key.startsWith(`${docId}_`)) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}
