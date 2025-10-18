# Style Architecture (`/src/lib/styles`)

This directory contains all the global styles of the application. Our philosophy is to use modern, modular, and maintainable CSS, taking advantage of CSS variables (Custom Properties) to create a cohesive and easy-to-customize design system.

## Design Philosophy

1.  **CSS Variables for Everything**: The core of our design system is based on the CSS variables defined in `global.css`. Instead of using hardcoded values (e.g., `#FFFFFF`, `16px`), we use semantic variables (e.g., `var(--color-background)`, `var(--font-size-base)`). This allows for total consistency and makes theme changes (such as a dark mode) much easier.

2.  **Minimal Global Styles**: `global.css` sets the base styles for HTML elements (`body`, `h1`, `p`, etc.) and defines all the design system variables. However, we avoid writing specific component styles here. The idea is to establish a default "canvas" and a set of tools (variables) for the components to use.

3.  **Per-Component Styles (Scoped)**: The vast majority of our styles are written directly within the Svelte components (`<style>`). Svelte processes these styles to be "scoped" by default, which means they only apply to the current component. This prevents selector conflicts and makes the components truly self-contained.

4.  **No Preprocessors (Sass/Less)**: We have chosen to use modern native CSS. CSS variables, along with features like `calc()`, `clamp()`, and advanced selectors, provide us with most of the power that preprocessors offer, but without the need for an additional dependency or a compilation step.

## File Structure

- `global.css`: The most important file. It defines:
  - **Color Variables**: Semantic names for all the colors used in the application (e.g., `--color-primary`, `--color-text`, `--color-background`).
  - **Typography**: Variables for font families, sizes (`--font-size-sm`, `--font-size-base`, etc.), weights, and line heights.
  - **Spacing and Sizing**: A spacing scale (`--space-xs`, `--space-sm`, etc.) for `margin`, `padding`, and `gap`. This ensures a consistent vertical and horizontal rhythm.
  - **Borders and Shadows**: Variables for `border-radius` and `box-shadow` to maintain a uniform appearance across all components.
  - **Z-Index**: A `z-index` stack to manage the layers of the interface (`--z-modal`, `--z-header`).
  - **Resets and Base Styles**: A simple CSS reset (often based on `modern-normalize`) and default styles for the `body`, links, etc.

- `tiptap.css`: Contains specific styles to override or supplement the default styles of the Tiptap/ProseMirror editor. This includes the appearance of the cursor, selection, placeholders, and styles for custom nodes.

## How to Use the Design System

Within a `<style>` block of a Svelte component, you simply reference the variables defined in `global.css`.

```svelte
<style>
  .my-button {
    background-color: var(--color-primary);
    color: var(--color-on-primary);
    padding: var(--space-sm) var(--space-md);
    font-size: var(--font-size-base);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }

  .my-button:hover {
    background-color: var(--color-primary-hover);
  }
</style>
```

This approach ensures that if you decide to change the brand's primary color, you only need to modify the `--color-primary` variable in `global.css`, and all the components that use it will be updated automatically.
