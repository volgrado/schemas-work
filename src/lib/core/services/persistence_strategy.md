# Persistence Strategy

This document outlines the dual-database strategy used in the application to manage different types of data.

## Overview

The application uses two distinct persistence mechanisms that operate orthogonally:

1.  **Documents (Yjs + IndexedDB)**
2.  **Cards (Dexie + IndexedDB)**

These two systems do not synchronize with each other. They manage different domains of data.

## 1. Documents (Yjs)

- **Library**: `Yjs` (CRDT) + `y-indexeddb`.
- **Purpose**: Manages the content of schema documents (nodes, text, hierarchy).
- **Storage**: Stores incremental _updates_ (binary blobs) in IndexedDB.
- **Reasoning**: Yjs provides excellent support for offline-first editing, history (undo/redo), and potential future real-time collaboration.
- **Access**:
  - **Write**: Via `y-indexeddb` provider.
  - **Read-Only**: `persistenceService.ts` can reconstruct a read-only `Y.Doc` by aggregating updates from IndexedDB without attaching a provider.

## 2. Cards (Dexie)

- **Library**: `Dexie.js` (Wrapper around IndexedDB).
- **Purpose**: Manages Flashcards (SRS items).
- **Storage**: Stores structured JSON objects (Cards, Decks).
- **Reasoning**: Cards require complex querying (filtering by due date, deck, tags) which is efficient in a structured SQL-like store like Dexie, but difficult in a CRDT.
- **Data Integrity**: We use `structuredClone` to ensure rich types (like `Date`) are preserved when persisting to Dexie.

## Interaction

There is **no direct synchronization** between Yjs and Dexie.

- A Document may _contain_ references to Cards (e.g., if we embed cards in the doc), but the Card data itself lives in Dexie.
- The `cardService` handles all Card operations.
- The `documentStore` handles all Document operations.
