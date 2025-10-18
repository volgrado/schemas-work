# Project Architecture (`/src/lib`)

Welcome to the heart of the application. The `/src/lib` directory contains all the main source code, organized in a modular way to promote maintainability, scalability, and a clear separation of responsibilities.

This documentation serves as a high-level guide to the architecture. for more details, see the `README.md` files within each subdirectory.

## General Architectural Philosophy

The application follows a design pattern inspired by **layered architecture** and **centralized state**, adapted to the SvelteKit ecosystem.

-   **Unidirectional Data Flow**: The user interface (Svelte components) reacts to changes in the state stores (Svelte Stores). User interactions in the components trigger actions in the stores, which in turn update the state, and the UI is updated accordingly. `UI -> Store -> UI`.
-   **Separation of Responsibilities**: Each directory has a clear purpose. Components do not contain complex business logic; stores orchestrate state and feature logic; and services encapsulate communication with external systems (such as databases or APIs).

## Directory Map

The purpose of each main directory within `src/lib` is described below:

### [`/actions`](./actions/README.md)
Contains custom Svelte actions (`use:action`). These are reusable functions that encapsulate DOM manipulation logic, such as detecting a click outside of an element or creating a portal.

### [`/assets`](./assets/README.md)
Stores all static assets such as SVG icons, images, and fonts. Vite/SvelteKit automatically processes and optimizes them.

### [`/components`](./components/README.md)
The home of all our Svelte components. It is subdivided into `core`, `features`, `layout`, and `ui` for a clear separation between presentation (dumb) components and feature (smart) components.

### [`/editor`](./editor/README.md)
Encapsulates all the configuration and logic of the Tiptap/ProseMirror text editor. It defines custom nodes and extensions that add the main functionality of the application, such as creating cards and slash commands.

### [`/schemas`](./schemas/README.md)
Defines validation schemas (using Zod) for interactions with the AI API. This ensures that the data received from the language models is structured and type-safe.

### [`/services`](./services/README.md)
Contains the business logic and communication with the outside world. It is divided into `core` services (authentication, errors), `features` (logic specific to a feature such as the calculation of spaced repetition), and `api` (clients for external APIs such as the database or the AI).

### [`/stores`](./stores/README.md)
The brain of the application. It contains all the Svelte Stores that manage the state of the application. The stores are the "glue" that connects the UI with the business logic, following a reactive pattern.

### [`/styles`](./styles/README.md)
Defines the application's design system through CSS. `global.css` sets all the CSS variables (colors, typography, spacing) that ensure a consistent look and feel throughout the UI.

### [`/types`](./types/README.md)
Contains global TypeScript type definitions used throughout the application. This helps maintain consistency and type safety.

### [`/utils`](./utils/README.md)
A collection of pure, reusable utility functions that do not fit into any other category. For example, date formatters, debounce functions, etc.