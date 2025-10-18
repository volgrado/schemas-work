# Component Architecture (`/src/lib/components`)

This directory contains all the Svelte components that make up the application's user interface. The structure and philosophy are designed to maximize reuse, maintainability, and a clear separation of responsibilities.

## Fundamental Principles

1.  **Separation of Logic and Presentation**: This is the most important principle. Components are mainly divided into two categories:
    - **UI Components (`/ui`)**: These are "dumb" and reusable components focused on appearance and low-level user interaction (e.g., `Button`, `Modal`, `Input`). They do not contain business logic.
    - **Feature Components (`/features`)**: These are "smart" components that orchestrate the logic of a specific functionality (e.g., `CardEditorPanel`, `ReviewPanel`). They connect to Svelte Stores to manage state.

2.  **Centralized State in Stores**: Components, especially feature components, should not manage complex state internally. Instead, they subscribe to the stores (`/src/lib/stores`). Components read the state from the stores to render and call the store's functions to execute actions. This follows a unidirectional data flow pattern and makes the application's state predictable and easy to debug.

3.  **Minimal Direct Service Invocation**: Components should rarely invoke services (`/src/lib/services`) directly. Business logic and service calls (e.g., for persistence or complex calculations) should be handled within the stores. Components simply trigger actions in the store (e.g., `reviewStore.startReview()`).

## Directory Structure

The organization is inspired by a mixture of atomic design and classification by functionality:

- **/core**: Contains fundamental components for the structure and experience of the application that are not specific to a single feature. They orchestrate other parts of the UI and often connect to central stores such as `documentStore` or `editorStore`.
  - _Example_: `DocumentView.svelte`, `Sidebar.svelte`.

- **/features**: Each subdirectory here corresponds to a main functionality of the application. These components are usually tightly coupled to a dedicated feature store.
  - _Example_: `cardEditor/CardEditorPanel.svelte` (associated with `cardEditorStore`), `review/ReviewPanel.svelte` (associated with `reviewStore`).

- **/layout**: Components that define the main structure of the page, such as headers, footers, and main content areas.
  - _Example_: `MainLayout.svelte`, `Header.svelte`.

- **/ui**: The application's "component library". They are generic, reusable, and presentation components. They are styled using global CSS variables (`/src/lib/styles`) and can have variants, but they are not aware of business logic.
  - _Example_: `Button.svelte`, `Input.svelte`, `Modal.svelte`.

## Interaction Patterns

- **Component -> Store**: A feature component invokes an action in a store. for example, clicking a button calls `commandBarStore.open()`.
- **Store -> Component**: The store updates its state. The component, being subscribed (`$commandBarStore`), automatically reacts to the new state and re-renders to show the command bar.
- **Component -> Component (Local)**: for simple interactions between parent and child that do not need a global state, props and Svelte's event forwarding (`createEventDispatcher`) are used. This avoids the overhead of creating a store for a purely local state.
