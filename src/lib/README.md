# Source Library (`src/lib`)

This directory contains the core application logic, reusable components, and static assets for SchemasWork.

## Directory Structure

### `actions/`

Svelte actions (custom directives) that can be applied to DOM elements.

- Used for things like click-outside detection, focus trapping, etc.

### `assets/`

Static assets imported directly into components.

- Images, fonts, and other media.

### `components/`

Reusable Svelte components organized by feature or UI pattern.

- **`editor/`**: Components related to the Tiptap rich text editor.
- **`layout/`**: High-level layout components (Header, WorkspaceView).
- **`tree/`**: The hierarchical schema visualization tree.
- **`ui/`**: Generic UI primitives (Buttons, Modals, Icons).
- **`review/`**: Components for the Spaced Repetition System (SRS) review mode.
- **`card/`**: Flashcard editor and preview components.

### `constants.ts`

Application-wide constants, configuration values, and magic numbers.

### `editor/`

Tiptap editor configuration and extensions.

- Custom node views and plugin logic.

### `locales/`

Internationalization (i18n) translation files.

### `schemas/`

Zod schemas for data validation and type definitions.

### `services/`

Business logic and data access layers.

- **`core/`**: Essential services (Directory, Error handling, Persistence).
- **`features/`**: Feature-specific logic (Schema parsing, Review algorithms).
- **`ai/`**: Client-side AI logic (if applicable).

### `stores/`

Svelte stores for global state management.

- `documentStore`: Manages the currently open document.
- `editorStore`: Tracks editor state (selection, focus).
- `themeStore`: Manages light/dark mode.

### `styles/`

Global CSS stylesheets.

- `app.css`: The main entry point for global styles and design tokens.

### `types/`

TypeScript type definitions and interfaces used across the application.

### `utils/`

General-purpose utility functions.

- Date formatting, string manipulation, etc.
