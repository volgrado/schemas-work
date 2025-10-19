# SchemasWork

SchemasWork is a modern, offline-first, and privacy-focused knowledge management tool designed to help you build and visualize complex schemas and conceptual frameworks. It leverages a powerful text editor and AI-driven features to streamline the process of learning, brainstorming, and documenting.

## Core Features

- **Offline-First:** All your data is stored locally in your browser using IndexedDB. You can use the application without an internet connection.
- **Privacy-Focused:** Your data never leaves your browser. All AI processing is done on the client-side.
- **Rich Text Editor:** A powerful editor based on Tiptap that allows you to structure your knowledge in a hierarchical way.
- **AI-Powered Assistance:**
  - **Create Schema from Text:** Automatically generate a structured schema from unstructured text.
  - **Expand Nodes:** Let the AI expand on a concept with relevant sub-points.
  - **Generate Flashcards:** Instantly create study cards from your notes.
- **Spaced Repetition System (SRS):** A built-in review system to help you remember what you've learned.
- **Secure Vault:** Export and import your entire knowledge base with password-based encryption.

## Tech Stack

- **SvelteKit:** A framework for building robust Svelte apps.
- **Tiptap:** A headless, framework-agnostic rich text editor.
- **Y.js:** A CRDT implementation for collaborative editing (used here for state management).
- **IndexedDB:** For local, persistent storage.
- **Lucide Icons:** For a clean and consistent look and feel.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (or `pnpm` or `yarn`)

### Installation

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/your-username/SchemasWork.git
    cd SchemasWork
    ```

2.  **Install dependencies:**

    ```sh
    npm install
    ```

### Running the Development Server

Once you've installed the dependencies, you can start the development server:

```sh
npm run dev

# Or to open the app in a new browser tab automatically
npm run dev -- --open
```

The application will be available at `http://localhost:5173`.

## Building for Production

To create a production-ready version of the app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> **Note:** To deploy your app, you may need to install a SvelteKit [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
