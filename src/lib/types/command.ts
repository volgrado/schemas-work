import type { IconName } from '$lib/types/iconName';

/**
 * Represents a command that can be executed from the command bar.
 */
export interface Command {
  /** A unique identifier for the command. */
  id: string;
  /** The user-facing label for the command. */
  label: string;
  /** The name of the icon to display next to the command. */
  icon: IconName;
  /** The function to execute when the command is triggered. */
  action: () => void | Promise<void>;
  /** An optional function to determine if the command is currently enabled. Defaults to true. */
  isEnabled?: () => boolean;
  /** Optional sub-commands for creating nested menus. */
  subItems?: Command[];
}