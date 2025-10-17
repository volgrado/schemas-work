# Services

This directory contains the core business logic and third-party API abstractions for the application. The services are organized into three subdirectories, each with a distinct responsibility.

## Core Services (`./core`)

These services provide the foundational, cross-cutting functionalities that the entire application relies on. They are abstract, generic, and not tied to any specific application feature.

- **`directoryService.ts`**: Manages the virtual file and folder hierarchy for user-created schemas. It provides a CRUD interface for `SchemaMetadata` objects and uses `localStorage` for persistence, with real-time, cross-tab synchronization.

- **`errorService.ts`**: A centralized service for capturing, storing, and managing application-wide errors. It creates a persistent, first-in-first-out log of issues that can be reviewed for debugging.

- **`persistenceService.ts`**: Abstracts the persistence layer for document content using Y.js and IndexedDB. It acts as the bridge between the in-memory, collaborative representation of a document and its physical storage in the browser.

## Feature Services (`./features`)

These services implement the business logic for specific, user-facing features of the application.

- **`cardService.ts`**: Manages the persistence and lifecycle of "cards" (e.g., flashcards, annotations) using a local IndexedDB database. It provides a robust CRUD interface for `Card` objects linked to specific nodes within a schema document.

- **`reviewService.ts`**: Implements the business logic for the spaced repetition learning (SRS) feature. It uses a modified SM-2 algorithm to calculate the optimal time to present a card for review, aiming to maximize learning and retention.

## TTS Services (`./tts`)

These services provide the text-to-speech (TTS) functionality for the application. They are designed to be modular and swappable.

- **`tts.service.ts`**: Defines the core interfaces for the Text-to-Speech (TTS) feature. It establishes a clear, implementation-agnostic contract for any TTS engine, decoupling the application's business logic from any specific implementation.

- **`BrowserTTSService.ts`**: An implementation of the `TTSService` interface that utilizes the native browser `window.speechSynthesis` API. It includes features to handle browser inconsistencies, such as robust voice loading, automatic text chunking, and a watchdog to prevent stalled synthesis.
