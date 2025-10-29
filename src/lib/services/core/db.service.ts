// src/lib/services/core/db.service.ts

const DB_NAME = 'SchemasWorkDB';
const DB_VERSION = 2; // IMPORTANT: Increment this number every time you change the schema!
const AUDIO_STORE_NAME = 'audioChunks';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Gets the singleton instance of the IndexedDB database.
 * This function handles the initial creation, version upgrades, and ensures
 * the connection is ready before resolving.
 * @returns A promise that resolves to the IDBDatabase instance.
 */
function getDb(): Promise<IDBDatabase> {
  // If the promise already exists, return it to prevent re-opening the DB.
  if (dbPromise) {
    return dbPromise;
  }

  // Create a new promise to manage the database opening process.
  dbPromise = new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    // This event is the ONLY place to make schema changes.
    // It runs for new users or when the DB_VERSION is incremented.
    openRequest.onupgradeneeded = (event) => {
      console.log(`Upgrading database to version ${DB_VERSION}...`);
      const db = (event.target as IDBOpenDBRequest).result;

      // Robustly create the object store only if it doesn't exist.
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
        console.log(`Object store "${AUDIO_STORE_NAME}" created.`);
      }
      // You can add more migration logic here for future versions, e.g.,
      // if (event.oldVersion < 3) { /* add another store */ }
    };

    openRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    openRequest.onerror = (event) => {
      console.error(
        'IndexedDB error:',
        (event.target as IDBOpenDBRequest).error
      );
      reject(new Error('Failed to open IndexedDB.'));
    };
  });

  return dbPromise;
}

/**
 * Saves an audio blob to the database.
 * @param id The unique ID for the audio chunk (e.g., 'docId_0').
 * @param audioBlob The audio blob to save.
 */
export async function saveAudio(id: string, audioBlob: Blob): Promise<void> {
  const db = await getDb(); // Guarantees the DB is ready and schema is correct.
  const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(AUDIO_STORE_NAME);
  const record = { id, audioBlob };
  store.put(record);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Retrieves an audio blob from the database.
 * @param id The unique ID of the audio chunk to retrieve.
 * @returns A promise that resolves to the Blob or null if not found.
 */
export async function getAudio(id: string): Promise<Blob | null> {
  const db = await getDb(); // Guarantees the DB is ready and schema is correct.
  const transaction = db.transaction(AUDIO_STORE_NAME, 'readonly');
  const store = transaction.objectStore(AUDIO_STORE_NAME);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result ? request.result.audioBlob : null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Deletes all audio chunks associated with a specific document ID.
 * @param docId The ID of the document whose audio should be deleted.
 */
export async function deleteAudioForDoc(docId: string): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(AUDIO_STORE_NAME);
  const request = store.openCursor();

  request.onsuccess = (event) => {
    const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
      .result;
    if (cursor) {
      if ((cursor.key as string).startsWith(docId)) {
        cursor.delete();
      }
      cursor.continue();
    }
  };

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
