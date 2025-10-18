# Editor Architecture (`/src/lib/editor`)

This directory encapsulates all the logic, configuration, and components related to the Tiptap/ProseMirror-based text editor. It is one of the most critical and complex parts of the application.

## Design Philosophy

The main goal is to create a powerful and personalized editing experience that integrates seamlessly with the rest of our Svelte application. The key to our architecture is **abstraction and modularity**.

1.  **Centralized Integration**: The initialization and configuration of the editor are centralized in the `DocumentView.svelte` component (`/src/lib/components/core/DocumentView.svelte`). This component is the **only** one that writes to the `editorStore`, following a "single writer, multiple readers" pattern.

2.  **Modular Extensions**: Each piece of editor functionality is implemented as a custom Tiptap extension. This keeps the code organized and allows features to be easily enabled or disabled. Extensions are divided into two categories:
    *   **Nodes**: Define block or inline elements in the document schema (e.g., `Card.ts`, `Heading.ts`).
    *   **Extensions**: Add behavior, keyboard shortcuts, or plugins without introducing a new node type (e.g., `SlashCommands`, `Highlight` via `suggestion.ts`).

3.  **Communication via Stores**: Communication between the editor and the rest of the application is done through Svelte Stores, mainly the `editorStore`. Custom extensions can read the state of other stores, but to send information *from* the editor *to* the Svelte UI, they update the `editorStore` or invoke actions in other stores.

## Directory Structure

-   **/nodes**: Contains the definitions of our custom Tiptap nodes. Each file defines the name, schema, commands, and rendering rules of the node.
    -   `Card.ts`: A complex example that defines the node for study cards, including custom attributes such as `nodeId`.

-   **/slashCommands**: Implements the functionality of the command menu that appears when typing `/`.
    -   `suggestion.ts`: The heart of this feature. It is a Tiptap extension that uses the `Suggestion` plugin to detect the activation pattern, filter commands, and, most importantly, **invoke actions on the `slashMenuStore`**. It passes the list of commands, the function to execute a command, and the screen position to the store.
    -   `commands.ts`: Defines the list of available commands, their icons, descriptions, and execution logic (which uses the Tiptap command chain).

-   `setup.ts`: A crucial file that exports the `createEditor` function. This function assembles all the pieces: it imports the node and behavior extensions, configures the plugins (such as `Collaboration` for Y.js), and returns a new instance of the Tiptap editor. This ensures that each instance of the editor is consistent.

## Data Flow for Complex Features (e.g., Slash Commands)

1.  **Detection (Tiptap)**: The user types `/`. The `suggestion.ts` extension in Tiptap detects this.
2.  **Opening the Store (Tiptap -> Store)**: The `suggestion.ts` extension calls `slashMenuStore.open()`, passing it all the necessary data: the list of commands, the user's query, a function for positioning (`clientRect`), and a **callback function** to execute the selected command.
3.  **Rendering (Store -> Svelte)**: The `SlashMenu.svelte` component (`/src/lib/components/features/slashMenu`) is subscribed to the `slashMenuStore`. It detects that `isOpen` is `true` and renders on the screen using the data from the store.
4.  **Selection (Svelte -> Store)**: The user navigates the menu. The `SlashMenu.svelte` component captures keystrokes and calls actions on the `slashMenuStore` such as `moveSelection()` or `triggerCommand()`.
5.  **Execution (Store -> Tiptap)**: `slashMenuStore.triggerCommand()` invokes the callback function that was passed to it in step 2. This callback, which lives inside the Tiptap extension, finally executes the command in the editor (e.g., `editor.chain().focus().setHeading({ level: 1 }).run()`).

This "round trip" pattern through a store is fundamental. It decouples the Svelte UI logic from the internal logic of the editor, allowing each part to do what it does best.