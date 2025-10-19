/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { get } from 'svelte/store';
import { slashMenuStore } from './slashMenuStore';
import type { CommandItem } from '$lib/editor/slashCommands';

// FIX: Use icon names that are valid according to the IconName type as defined in the actual application code.
// The H1 command uses the 'type' icon.
const mockCommands: CommandItem[] = [
  {
    title: 'Heading 1',
    group: 'Formatting',
    command: vi.fn(),
    description: 'A large heading.',
    icon: 'type', // Corrected from 'heading-1' to 'type'
  },
  {
    title: 'Italic',
    group: 'Formatting',
    command: vi.fn(),
    description: 'Emphasized text.',
    icon: 'italic',
  },
  {
    title: 'Image',
    group: 'Content',
    command: vi.fn(),
    description: 'Embed an image.',
    icon: 'image',
  },
  {
    title: 'Video',
    group: 'Content',
    command: vi.fn(),
    description: 'Embed a video.',
    icon: 'video',
  },
];

const mockClientRect = () => ({
  top: 100,
  left: 50,
  right: 50,
  bottom: 120,
  width: 0,
  height: 20,
  x: 50,
  y: 100,
  toJSON: () => ({}),
});

const mockCommandToExecute = vi.fn();

describe('slashMenuStore', () => {
  beforeEach(() => {
    // Use the store's own method to reset to a clean state
    slashMenuStore.close();
    // Clear any mock function calls from previous tests
    vi.clearAllMocks();
  });

  it('should have a correct initial state', () => {
    const state = get(slashMenuStore);
    expect(state.isOpen).toBe(false);
    expect(state.allitems).toEqual([]);
    expect(state.filteredItems).toEqual([]);
    expect(state.groups).toEqual([]);
    expect(state.selectedIndex).toBe(0);
  });

  describe('open', () => {
    it('should open the menu, set state, and filter items by the first group', () => {
      slashMenuStore.open(
        mockCommands,
        mockClientRect,
        mockCommandToExecute,
        ''
      );

      const state = get(slashMenuStore);
      expect(state.isOpen).toBe(true);
      expect(state.allitems).toEqual(mockCommands);
      expect(state.groups).toEqual(['Formatting', 'Content']);
      expect(state.activeGroupIndex).toBe(0);
      // Should initially filter by the first group, "Formatting"
      expect(state.filteredItems).toEqual([mockCommands[0], mockCommands[1]]);
      expect(state.selectedIndex).toBe(0);
      expect(state.commandToExecute).toBe(mockCommandToExecute);
    });
  });

  describe('close', () => {
    it('should close the menu and reset to the initial state', () => {
      // First, open it
      slashMenuStore.open(
        mockCommands,
        mockClientRect,
        mockCommandToExecute,
        ''
      );
      expect(get(slashMenuStore).isOpen).toBe(true);

      // Then, close it
      slashMenuStore.close();
      const state = get(slashMenuStore);
      expect(state.isOpen).toBe(false);
      expect(state.allitems).toEqual([]);
    });
  });

  describe('moveSelection', () => {
    beforeEach(() => {
      // Open with all commands, which defaults to the 'Formatting' group
      slashMenuStore.open(
        mockCommands,
        mockClientRect,
        mockCommandToExecute,
        ''
      );
    });

    it('should move selection down by one', () => {
      slashMenuStore.moveSelection(1);
      expect(get(slashMenuStore).selectedIndex).toBe(1);
    });

    it('should wrap around when moving down from the last item', () => {
      slashMenuStore.moveSelection(1); // Now at index 1 (last in group)
      slashMenuStore.moveSelection(1); // Should wrap to 0
      expect(get(slashMenuStore).selectedIndex).toBe(0);
    });

    it('should move selection up by one', () => {
      slashMenuStore.moveSelection(1); // Move to index 1
      slashMenuStore.moveSelection(-1); // Move back to 0
      expect(get(slashMenuStore).selectedIndex).toBe(0);
    });

    it('should wrap around when moving up from the first item', () => {
      slashMenuStore.moveSelection(-1); // Should wrap to index 1
      expect(get(slashMenuStore).selectedIndex).toBe(1);
    });
  });

  describe('moveGroup', () => {
    beforeEach(() => {
      slashMenuStore.open(
        mockCommands,
        mockClientRect,
        mockCommandToExecute,
        ''
      );
    });

    it('should move to the next group and update filtered items', () => {
      slashMenuStore.moveGroup(1);
      const state = get(slashMenuStore);
      expect(state.activeGroupIndex).toBe(1);
      expect(state.filteredItems).toEqual([mockCommands[2], mockCommands[3]]);
      expect(state.selectedIndex).toBe(0); // Index should reset
    });

    it('should wrap to the first group when moving next from the last group', () => {
      slashMenuStore.moveGroup(1); // Move to group 1
      slashMenuStore.moveGroup(1); // Wrap back to group 0
      const state = get(slashMenuStore);
      expect(state.activeGroupIndex).toBe(0);
      expect(state.filteredItems).toEqual([mockCommands[0], mockCommands[1]]);
    });

    it('should wrap to the last group when moving previous from the first group', () => {
      slashMenuStore.moveGroup(-1); // Wrap to group 1
      const state = get(slashMenuStore);
      expect(state.activeGroupIndex).toBe(1);
      expect(state.filteredItems).toEqual([mockCommands[2], mockCommands[3]]);
    });
  });

  describe('triggerCommand', () => {
    beforeEach(() => {
      slashMenuStore.open(
        mockCommands,
        mockClientRect,
        mockCommandToExecute,
        ''
      );
    });

    it('should execute the selected command and close the menu', () => {
      // Select the second item in the first group ("Italic")
      slashMenuStore.moveSelection(1);
      expect(get(slashMenuStore).selectedIndex).toBe(1);

      slashMenuStore.triggerCommand();

      // Check that the correct command was executed
      expect(mockCommandToExecute).toHaveBeenCalledOnce();
      expect(mockCommandToExecute).toHaveBeenCalledWith(mockCommands[1]);

      // Check that the menu is now closed
      expect(get(slashMenuStore).isOpen).toBe(false);
    });

    it('should do nothing if menu is already closed', () => {
      slashMenuStore.close();
      slashMenuStore.triggerCommand();
      expect(mockCommandToExecute).not.toHaveBeenCalled();
    });
  });
});
