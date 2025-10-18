/**
 * @file Defines the IconName type, which is a union of all valid icon names
 * available in the Icon.svelte component. This provides type safety for any
 * component prop that expects an icon name.
 */

// To add a new icon, add it to the `icons` object in `src/lib/components/ui/Icon.svelte`
// and then add the key to this type union.

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

  // Conceptual & App-Specific
  | 'zap'
  | 'sparkles'
  | 'git-branch'
  | 'download-cloud'
  | 'upload-cloud'
  
  // Special alias
  | 'plus-slash-minus';
