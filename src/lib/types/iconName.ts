// src/lib/types/iconName.ts

/**
 * Defines a strict type for all valid icon names in the application.
 *
 * This type is directly derived from the keys of the `icons` dictionary in the
 * `Icon.svelte` component. Using this type instead of a generic `string`
 * provides several advantages:
 *
 * 1.  **Autocomplete:** The code editor (VS Code) will suggest valid icon names
 *     when you use a component that expects this prop.
 * 2.  **Type Safety:** TypeScript will throw a compile-time error if
 *     you try to use an icon name that does not exist, preventing broken icons
 *     in production.
 * 3.  **Maintainability:** If you add a new icon to `Icon.svelte`, you only need
 *     to add it here to make it safely available throughout the application.
 */
export type IconName =
  // General and File
  | 'plus'
  | 'command'
  | 'download-cloud'
  | 'upload-cloud'
  | 'file-text'
  | 'folder'
  | 'check-circle'
  | 'git-branch'
  | 'edit-3'
  // UI and Actions
  | 'x'
  | 'copy'
  | 'trash-2'
  | 'sparkles'
  | 'pen-tool'
  // Functionalities
  | 'zap'
  | 'volume-2'
  | 'play'
  | 'pause'
  | 'x-circle'
  // Onboarding and Help
  | 'lock'
  | 'help-circle'
  // Text Editor
  | 'bold'
  | 'italic'
  | 'list'
  | 'type';
