/**
 * @file Defines the IconName type, a union of all valid icon names
 * available in the Icon.svelte component.
 * Provides type safety for any prop that expects an icon name.
 *
 * To add a new icon:
 * 1. Add it to the `icons` object in src/lib/components/ui/Icon.svelte
 * 2. Add its key to this type union
 */
export type IconName =
  // General & UI
  | 'plus'
  | 'minus'
  | 'x'
  | 'command'
  | 'help-circle'
  | 'check-circle'
  | 'x-circle'
  | 'alert-triangle'
  | 'loader'
  | 'copy'
  | 'trash-2'
  | 'edit-3'
  | 'pen-tool'
  | 'folder'
  | 'file-text'
  | 'lock'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'settings'

  // Media & Audio
  | 'play'
  | 'pause'
  | 'mic'
  | 'volume-2'
  | 'fast-forward'
  | 'skip-back'
  | 'skip-forward'
  | 'image'
  | 'video'

  // Text & Formatting
  | 'type'
  | 'bold'
  | 'italic'
  | 'list'
  | 'list-ordered'

  // Conceptual & App-Specific
  | 'book-open'
  | 'zap'
  | 'sparkles'
  | 'git-branch'
  | 'download-cloud'
  | 'upload-cloud'

  // Special alias
  | 'plus-slash-minus';
