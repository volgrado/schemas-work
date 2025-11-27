# Design System

## Philosophy

Our design language is **"Premium Glassmorphism"**. It emphasizes:

- **Depth**: Using shadows, layers, and blur effects (`backdrop-filter`).
- **Clarity**: High contrast text, clean typography (Inter).
- **Vibrancy**: Subtle gradients and rich accent colors.

## Styling Approach

We use **Vanilla CSS** with **CSS Variables** for theming. We do NOT use Tailwind CSS.

### Core Files

- `src/lib/styles/tokens.css`: The source of truth for all design tokens.
- `src/lib/styles/glassmorphism.css`: Utility classes for glass effects.
- `src/lib/styles/app.css`: Global resets and base styles.

## Tokens

Always use CSS variables instead of hardcoded values.

### Colors

| Variable             | Usage                                 |
| -------------------- | ------------------------------------- |
| `--color-background` | Main app background                   |
| `--color-text`       | Primary text color                    |
| `--color-accent`     | Primary action color (Buttons, Links) |
| `--color-border`     | Borders and dividers                  |

### Spacing

Use the `--space-*` scale for margins and padding.

- `--space-xs` (4px)
- `--space-sm` (8px)
- `--space-md` (16px)
- `--space-lg` (24px)

### Typography

- Font Family: `--font-main` (Inter)
- Sizes: `--font-size-sm`, `--font-size-base`, `--font-size-lg`, etc.

## Theming

The application supports Light and Dark modes.

- The `.dark-theme` class is applied to the `html` element.
- All color variables are redefined inside `.dark-theme` in `tokens.css`.

## Common Patterns

### Glass Panel

To create a standard glass container:

```html
<div class="glass-panel">
  <!-- Content -->
</div>
```

### Buttons

Use the `Button` component from `@ui/Button.svelte`. It automatically consumes the design tokens.
