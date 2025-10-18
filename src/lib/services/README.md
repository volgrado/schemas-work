# Service Architecture (`/src/lib/services`)

This directory is the **business logic layer** of the application. It is responsible for orchestrating complex operations, implementing feature logic, and acting as an intermediary between the application and external systems (databases, APIs, SDKs).

## Design Philosophy

The main goal is to achieve a **strict separation of responsibilities** and high **cohesion**, following solid software design principles.

1.  **Orchestration through Stores**: Services are not invoked directly by UI components. **Svelte Stores** act as state controllers and orchestrators. A store invokes one or more services to execute an operation and, based on the result, updates its state. The UI, in turn, reacts to changes in the store.
    *   *Example*: `reviewStore.submitReview()` invokes `reviewService` and `cardService` to process a review, and then updates its state with the next card.

2.  **Dependency Abstraction (Inversion of Control)**: Services hide the implementation details of data sources and APIs. `cardService` exposes an `updateCard(card)` method, but the rest of the application does not know if this is saved in Firebase, a REST API, or `localStorage`. This principle allows us to swap dependencies without affecting business logic.

3.  **Composition and Single Responsibility**: Each service should have a clear and unique responsibility. A service can be composed of others to perform more complex tasks, promoting code reuse.
    *   *Example*: `reviewService` does not know how to save a card; it delegates that responsibility to `cardService`.

## Directory Structure

The structure is designed to reflect this separation of responsibilities, dividing into layers of abstraction.

-   **/api**: Contains the **lowest-level API clients**. Their sole responsibility is to perform network communication (e.g., `fetch`) and handle data serialization/deserialization. They do not contain business logic.
    -   `databaseClient.ts`: `get`, `post`, `put` functions that interact with the database backend.
    -   `aiClient.ts`: Logic for sending prompts to a language model and receiving the response.

-   **/core**: Essential cross-cutting services for the application's operation, but not tied to a specific feature.
    -   `errorService.ts`: Centralized service for error reporting and logging.
    -   `authService.ts`: Manages authentication, user sessions, and tokens.
    -   `syncService.ts`: Orchestrates data synchronization with the backend (potentially using Y.js or similar).

-   **/features**: This is where the **heart of the business logic** resides. Each service implements the rules and processes for a specific application feature.
    -   `reviewService.ts`: Implements the spaced repetition algorithm (`calculateNextReviewDate`). It does not interact directly with the database.
    -   `cardService.ts`: Provides a CRUD-like API (`createCard`, `updateCard`) for cards. It acts as an abstraction layer over the `databaseClient`, transforming data if necessary.

-   **/tts** (Example of Interface Abstraction):
    -   `tts.service.ts`: Defines a `TTSService` **interface** (`speak`, `pause`). This establishes a contract for any Text-to-Speech service.
    -   `BrowserTTSService.ts`: A **concrete implementation** that uses the browser's `SpeechSynthesis` API.
    -   `CloudTTSService.ts` (Hypothetical): Another implementation that could use a cloud AI API, interchangeable with the previous one.

## Detailed Example Flow: Reviewing a Card

1.  **UI (`ReviewPanel.svelte`)**: The user clicks "Good". `reviewStore.submitReview('good')` is invoked.
2.  **Store (`reviewStore`)**:
    a. Gets the current card from its state.
    b. Invokes `reviewService.calculateNextReview(currentCard, 'good')` to get the new review parameters (e.g., `dueDate`, `interval`).
    c. Creates an `updatedCard` object by merging the new parameters.
    d. Invokes `cardService.updateCard(updatedCard)` to persist the change.
    e. On success, updates its own state to load the next card.
3.  **Feature Service (`reviewService`)**: The `calculateNextReview` function executes pure logic, without side effects, and returns the result.
4.  **Feature Service (`cardService`)**: The `updateCard` function invokes `databaseClient.put('/cards/123', updatedCard)`. It may contain logic to transform the card to the format expected by the API.
5.  **API Client (`databaseClient`)**: The `put` function performs the `fetch` call, manages authentication headers, and returns the server's response.

This flow demonstrates how each layer has a clear responsibility, which makes the system easier to understand, test, and maintain.