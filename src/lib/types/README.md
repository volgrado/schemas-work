# Global Type Definitions (`/src/lib/types`)

This directory centralizes the TypeScript type and interface definitions that are used in multiple parts of the application. It serves as the "source of truth" for shared data structures.

## Philosophy

1.  **Don't Repeat Yourself (DRY)**: Instead of defining the same data structure in multiple files (which would lead to inconsistencies), we define it once here and import it wherever it is needed.

2.  **Clarity and Contract**: Types and interfaces act as a form of documentation and define a clear "contract" for the shape of the data flowing through the application. This makes the code easier to understand and reason about.

3.  **Global Type Safety**: By having a set of shared types, TypeScript can verify at compile time that the data passing between different modules (e.g., from a service to a store, and from a store to a component) is consistent, preventing an entire class of runtime errors.

## What Goes Here?

-   **Domain Data Types**: The main data structures of the application. For example, `Card.ts` defines what a study card looks like, with its properties `id`, `question`, `answer`, `dueDate`, etc. `Document.ts` defines the structure of a document.

-   **State Types**: Sometimes, the shape of a complex store's state (`TTSState`, `ReviewState`) is defined here to be reused or to decouple the store's definition from its implementation.

-   **Interfaces for Services**: Interfaces can be defined to abstract service implementations (e.g., `TTSService` in `tts.service.ts`), allowing for dependency injection and facilitating testing.

## What Does NOT Go Here?

-   **Component-Specific Types**: If a type is only used within a single Svelte component and is not shared, it is better to keep it local to that component. This avoids cluttering the global namespace.

-   **Inferred Types**: If a type can be easily inferred from a function or a Zod schema (like those in `/lib/schemas`), it is often not necessary to declare it explicitly here. For example, the type for `createCard` is inferred directly from the `createCardSchema`.

## Usage Example

The `Card` type is a perfect example. It is defined in `src/lib/types/Card.ts` and then imported into:

-   `cardService.ts`: To type the arguments and return values of its functions (`getCard(id: string): Promise<Card>`).
-   `cardEditorStore.ts`: To type the card currently being edited (`$cardEditorStore.card: Card | null`).
-   `ReviewPanel.svelte`: To type the prop that receives the card to be reviewed (`export let card: Card`).

If in the future we need to add a new property to all cards (e.g., `tags: string[]`), we only need to modify `Card.ts`, and TypeScript will immediately point out all the places in the application that need to be updated to handle this new property.