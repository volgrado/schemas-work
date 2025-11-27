# Architecture Guidelines

## Overview
This project follows a **Modular Monolith** architecture using SvelteKit. The goal is to maintain the simplicity of a monolith while enforcing strict boundaries between features to ensure scalability.

## Directory Structure

### `src/lib/core`
Contains the foundational building blocks of the application. Code here should be:
- **Generic**: Not tied to any specific business feature.
- **Stable**: Changes infrequently.
- **Shared**: Used by multiple modules.

Examples: `ui` (components), `utils` (helpers), `types` (shared interfaces).

### `src/lib/modules`
Contains the business features of the application. Each module (e.g., `editor`, `command-bar`) should be self-contained.

**Module Internal Structure:**
- **`domain/`**: Pure business logic, entities, and interfaces. NO UI code. NO framework-specific code (if possible).
- **`infra/`**: Implementations of interfaces, API calls, database access.
- **`ui/`**: Svelte components, stores, and view logic.

### `src/lib/services`
Contains **global, cross-cutting services** that do not belong to a specific feature module.

**Rules for Services:**
1.  **Global vs. Module**:
    -   If a service is used by *only one* module, place it in `src/lib/modules/[module]/infra`.
    -   If a service orchestrates multiple modules or handles a cross-cutting concern (e.g., Logging, Analytics, Auth), place it in `src/lib/services`.
2.  **Dependencies**:
    -   Modules should NOT import directly from other modules' `infra` or `ui`.
    -   Communication between modules should happen via:
        -   Global Stores (State).
        -   Event Bus (if available).
        -   Shared Interfaces in `core`.
3.  **Circular Dependencies**:
    -   `core` must NEVER import from `modules`.
    -   `modules` can import from `core`.
    -   `services` can import from `core` and `modules` (carefully).

## State Management
We use **Svelte 5 Runes** (`.svelte.ts`) for state management.
-   **Global Stores**: Located in `src/lib/stores`. These hold application-wide state (e.g., `user`, `theme`).
-   **Module Stores**: Located in `src/lib/modules/[module]/ui`. These hold local state for the feature.

## Offline First
We use **Dexie** (IndexedDB) and **Yjs** for data persistence. All data mutations should go through the appropriate service/store which handles the sync.
