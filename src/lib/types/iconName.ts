/**
 * @file Defines a union type of all valid icon names used throughout the application.
 * @remarks This file acts as a centralized and type-safe registry for all icons.
 * By defining a strict `IconName` type, we can prevent typos and ensure that only valid
 * icon names are used in components, improving maintainability and reducing runtime errors.
 * The names should correspond to the icon identifiers used by the icon library (e.g., Feather Icons).
 */

export type IconName =
  // General Purpose & File System
  | 'plus'          // Add new item
  | 'command'       // Command bar, keyboard shortcuts
  | 'download-cloud'// Export, download
  | 'upload-cloud'  // Import, upload
  | 'file-text'     // Represents a schema or document
  | 'folder'        // Represents a folder or directory
  | 'check-circle'  // Success, completion
  | 'git-branch'    // Versioning, branching (future use)
  | 'edit-3'        // Edit, rename

  // UI Elements & Common Actions
  | 'x'             // Close, cancel
  | 'copy'          // Copy to clipboard
  | 'trash-2'       // Delete, remove
  | 'sparkles'      // AI, magic features
  | 'pen-tool'      // Drawing, annotation (future use)

  // Feature-Specific Functionalities
  | 'zap'           // Quick actions, triggers
  | 'volume-2'      // Audio, text-to-speech volume
  | 'play'          // Start playback
  | 'pause'         // Pause playback
  | 'x-circle'      // Stop, clear

  // Text-to-Speech (TTS) Controls
  | 'skip-back'     // Go to previous track/node
  | 'skip-forward'  // Go to next track/node
  | 'fast-forward'  // Increase playback speed
  | 'mic'           // Voice selection

  // Status Indicators
  | 'loader'        // Loading, in progress
  | 'alert-triangle'// Warning, error

  // Onboarding & Help
  | 'lock'          // Security, password
  | 'help-circle'   // Help, information

  // Text Editor & Formatting
  | 'bold'          // Bold text
  | 'italic'        // Italic text
  | 'list'          // Bulleted or numbered list
  | 'type'          // General text/typography
  | 'minus'         // Horizontal rule, divider
