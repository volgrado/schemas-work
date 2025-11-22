/**
 * @file Defines the IconName type, a union of all valid icon names
 * available in the Icon.svelte component. Provides type safety for
 * any prop that expects an icon name.
 * @module types/iconName
 *
 * To add a new icon:
 * 1. Add it to the `icons` object in src/lib/components/ui/Icon.svelte
 * 2. Add its key to this type union, keeping the lists alphabetized.
 */
export type IconName =
  // General & UI
  | 'alert-triangle'
  | 'activity'
  | 'archive'
  | 'arrow-left'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-up' // Added for the collapsible TTS controller
  | 'command'
  | 'copy'
  | 'edit-3'
  | 'eye'
  | 'eye-off'
  | 'file-plus'
  | 'file-text'
  | 'folder'
  | 'help-circle'
  | 'history'
  | 'key'
  | 'layout'
  | 'loader'
  | 'lock'
  | 'minus'
  | 'monitor'
  | 'moon'
  | 'paperclip' // Added as requested
  | 'pen-tool'
  | 'plus'
  | 'plus-square'
  | 'refresh-cw'
  | 'rotate-ccw'
  | 'search'
  | 'settings'
  | 'sun'
  | 'target'
  | 'trash-2'
  | 'x'
  | 'x-circle'

  // Media & Audio
  | 'fast-forward'
  | 'image'
  | 'mic'
  | 'pause'
  | 'play'
  | 'skip-back'
  | 'skip-forward'
  | 'video'
  | 'volume-2'

  // Text & Formatting
  | 'bold'
  | 'italic'
  | 'list'
  | 'list-ordered'
  | 'type'

  // Conceptual & App-Specific
  | 'award'
  | 'book-open'
  | 'download-cloud'
  | 'git-branch'
  | 'sparkles'
  | 'upload-cloud'
  | 'zap'

  // Special alias
  | 'plus-slash-minus';
