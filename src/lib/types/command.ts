import type { IconName } from '$lib/types/iconName';

/**
 * Represents a command that can be executed from the command bar.
 * This is a general-purpose interface used for defining actions throughout the application,
 * often appearing in menus or toolbars.
 */
export interface Command {
  /** A unique identifier for the command, used for tracking and logic. */
  id: string;
  /** The user-facing label for the command, which is displayed in the UI. */
  label: string;
  /** The name of the icon to display next to the command, providing a visual cue. */
  icon: IconName;
  /** The function to execute when the command is triggered by the user. Can be synchronous or asynchronous. */
  action: () => void | Promise<void>;
  /** An optional function to determine if the command is currently enabled and interactive. Defaults to `true` if not provided. */
  isEnabled?: () => boolean;
  /** Optional sub-commands for creating nested menus, allowing for more complex command structures. */
  subItems?: Command[];
}
