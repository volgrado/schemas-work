# Architectural Overview: Svelte Stores

## Philosophy

This directory is the central hub for the application's client-side state management. It contains all the Svelte stores that hold and manage the application's reactive data. By centralizing the stores, we create a single source of truth for the application's state, making it easier to reason about, debug, and test.

### Key Principles:

- **Single Source of Truth**: Each piece of application state should be owned by a single store. This avoids data duplication and synchronization issues.
- **Reactivity**: The stores are Svelte stores, which means that any component that subscribes to a store will automatically re-render when the store's value changes.
- **Separation of Concerns**: The stores are responsible for managing state, not for fetching data or performing business logic. That is the responsibility of the services.
