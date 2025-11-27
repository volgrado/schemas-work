# Schemas Work

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Svelte](https://img.shields.io/badge/svelte-v5-orange.svg)
![Vite](https://img.shields.io/badge/vite-fast-yellow.svg)
![TypeScript](https://img.shields.io/badge/typescript-strict-blue.svg)

**Schemas Work** is a modern, offline-first knowledge management tool designed to help you build, visualize, and master complex conceptual frameworks. It combines a powerful rich text editor with AI-driven insights and a spaced repetition system, all wrapped in a premium glassmorphic interface.

## ✨ Key Features

-   **🧠 AI-Powered**: Generate schemas from text, expand concepts, and auto-create flashcards using local-first AI.
-   **🔒 Offline & Private**: Built on **IndexedDB** and **Dexie**. Your data lives in your browser and never leaves without your permission.
-   **💎 Premium Design**: A stunning "Glassmorphism" UI built with **Vanilla CSS** and modern design tokens.
-   **📝 Rich Text Editor**: A customized **Tiptap** editor for structuring knowledge hierarchically.
-   **🔄 Spaced Repetition**: Integrated SRS to help you retain what you learn.

## 📚 Documentation

-   **[Architecture](./ARCHITECTURE.md)**: Learn about our Modular Monolith structure and Svelte 5 Runes usage.
-   **[Design System](./DESIGN_SYSTEM.md)**: Explore our "Premium Glassmorphism" design philosophy and token usage.
-   **[Contributing](./CONTRIBUTING.md)**: Guidelines for setting up the dev environment and submitting PRs.

## 🚀 Quick Start

### Prerequisites

-   Node.js v18+
-   npm (or pnpm/yarn)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/schemas-work.git
    cd schemas-work
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```

The app will be available at `http://localhost:5173`.

## 🏗️ Build for Production

To create a production-ready build:

```bash
npm run build
```

Preview the build locally:

```bash
npm run preview
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License.
