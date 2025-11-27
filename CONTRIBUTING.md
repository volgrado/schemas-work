# Contributing to Schemas Work

Thank you for your interest in contributing to **Schemas Work**! We welcome contributions from the community to help make this the best offline-first knowledge management tool.

## 🚀 Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/schemas-work.git
    cd schemas-work
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Start the development server**:
    ```bash
    npm run dev
    ```

## 🛠️ Development Workflow

1.  **Create a new branch** for your feature or fix:
    ```bash
    git checkout -b feature/my-new-feature
    # or
    git checkout -b fix/bug-description
    ```
2.  **Make your changes**. Please adhere to the [Architecture Guidelines](./ARCHITECTURE.md) and [Design System](./DESIGN_SYSTEM.md).
3.  **Verify your changes**:
    - Run the linter: `npm run lint`
    - Run type checking: `npm run check`
    - Run tests: `npm run test:unit`

## 🎨 Coding Standards

We enforce high code quality standards to maintain a robust and maintainable codebase.

-   **Style**: We use **Prettier** for code formatting.
    -   Run `npm run format` to automatically format your code.
-   **Linting**: We use **ESLint** to catch errors and enforce best practices.
    -   Run `npm run lint` to check for issues.
-   **TypeScript**: Strict type safety is required. Avoid `any` whenever possible.
-   **Svelte 5**: We use **Runes** (`$state`, `$derived`, `$effect`) for all new state management. Avoid legacy stores (`writable`, `readable`) unless interfacing with older libraries.

## 📝 Commit Messages

We follow the **Conventional Commits** specification. This helps us generate changelogs and version numbers automatically.

**Format**: `<type>(<scope>): <description>`

**Types**:
-   `feat`: A new feature
-   `fix`: A bug fix
-   `docs`: Documentation only changes
-   `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
-   `refactor`: A code change that neither fixes a bug nor adds a feature
-   `perf`: A code change that improves performance
-   `test`: Adding missing tests or correcting existing tests
-   `chore`: Changes to the build process or auxiliary tools

**Example**: `feat(editor): add support for image resizing`

## 🧪 Testing

-   **Unit Tests**: We use **Vitest**. Place test files alongside the source files (e.g., `utils.test.ts`).
-   **E2E Tests**: We use **Playwright**. E2E tests are located in the `e2e` directory.

## 📦 Pull Requests

1.  Push your branch to your fork.
2.  Open a Pull Request against the `main` branch.
3.  Provide a clear description of your changes and link to any relevant issues.
4.  Ensure all CI checks pass.

Thank you for contributing!
