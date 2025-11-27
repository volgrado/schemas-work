# Module Guidelines

This directory contains the feature modules of the application. Each module represents a distinct business domain.

## Structure

Every module must follow this internal structure:

```
src/lib/modules/[module-name]/
├── domain/       # Pure business logic, entities, and interfaces
├── infra/        # Implementations, API calls, DB access
├── ui/           # Svelte components and stores
└── index.ts      # Public API of the module
```

### 1. Domain (`/domain`)

-   **Purpose**: Define _what_ the module does.
-   **Contents**: Interfaces, Types, Entity Classes, Pure Functions.
-   **Dependencies**: Can import from `core/types` or `core/utils`. **Cannot** import from `infra` or `ui`.

### 2. Infra (`/infra`)

-   **Purpose**: Define _how_ the module does it.
-   **Contents**: Service implementations, API clients, Repositories.
-   **Dependencies**: Imports `domain`. Can import `core`.

### 3. UI (`/ui`)

-   **Purpose**: Present the feature to the user.
-   **Contents**: `.svelte` components, `.svelte.ts` stores.
-   **Dependencies**: Imports `domain` and `infra`. Can import `core/ui`.

### 4. Public API (`index.ts`)

-   **Purpose**: Expose only what other modules need.
-   **Rule**: Other modules should only import from `src/lib/modules/[module-name]/index.ts` (or subpaths if strictly necessary, but prefer the index).

## Creating a New Module

1.  Create the directory structure.
2.  Define your domain entities and interfaces first.
3.  Implement the logic in `infra`.
4.  Build the UI components.
5.  Export the public interface in `index.ts`.

## Communication

-   **State**: Use global stores for shared state.
-   **Events**: Use a global event bus or callback props for loose coupling.
-   **Direct Calls**: Avoid importing `infra` services of one module into another. Use the public API.
