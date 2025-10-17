/**
 * @file Defines a union type of all valid icon names used throughout the application.
 * @module iconName
 * @remarks This file acts as a centralized and type-safe registry for all icons.
 */

/**
 * A union type representing all valid icon names.
 */
export type IconName =
	// General Purpose & File System
	| 'plus'
	| 'command'
	| 'download-cloud'
	| 'upload-cloud'
	| 'file-text'
	| 'folder'
	| 'check-circle'
	| 'git-branch'
	| 'edit-3'

	// UI Elements & Common Actions
	| 'x'
	| 'copy'
	| 'trash-2'
	| 'sparkles'
	| 'pen-tool'

	// Feature-Specific Functionalities
	| 'zap'
	| 'volume-2'
	| 'play'
	| 'pause'
	| 'x-circle'

	// Text-to-Speech (TTS) Controls
	| 'skip-back'
	| 'skip-forward'
	| 'fast-forward'
	| 'mic'

	// Status Indicators
	| 'loader'
	| 'alert-triangle'

	// Onboarding & Help
	| 'lock'
	| 'help-circle'

	// Text Editor & Formatting
	| 'bold'
	| 'italic'
	| 'list'
	| 'type'
	| 'minus';
