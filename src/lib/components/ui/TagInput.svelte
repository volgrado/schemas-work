<!--
  @component
  TagInput

  @description
  An exceptional, production-ready component for inputting tags. It provides a rich,
  accessible user experience by displaying tags as "pills" that can be individually
  removed. It supports intuitive keyboard interactions, paste-to-add, and prevents
  duplicate entries.
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Icon from '$lib/components/ui/Icon.svelte';

  let {
    tags = $bindable(),
    id = undefined,
    ...rest
  } = $props<{ tags: string[] } & HTMLInputAttributes>();

  let inputValue = $state('');
  let inputElement: HTMLInputElement;
  let isDeletingLastTag = $state(false);

  function addTags(text: string) {
    const newTags = text
      .split(/[, ]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (newTags.length === 0) return;

    const uniqueNewTags = newTags.filter((tag) => !tags.includes(tag));
    if (uniqueNewTags.length > 0) {
      tags = [...tags, ...uniqueNewTags];
    }

    inputValue = '';
    isDeletingLastTag = false;
  }

  function removeTag(indexToRemove: number) {
    tags = tags.filter((_: string, index: number) => index !== indexToRemove);
    isDeletingLastTag = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Backspace') {
      isDeletingLastTag = false;
    }

    if (['Enter', ',', ' '].includes(event.key)) {
      if (inputValue.trim()) {
        event.preventDefault();
        addTags(inputValue);
      }
      return;
    }

    if (event.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      if (isDeletingLastTag) {
        removeTag(tags.length - 1);
      } else {
        isDeletingLastTag = true;
      }
    }
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text/plain');
    if (pastedText) {
      addTags(pastedText);
    }
  }
</script>

<!--
  A11Y ENHANCEMENT:
  - `role="listbox"` tells screen readers this is a list of selectable items.
  - `tabindex="0"` makes the entire component focusable via keyboard.
  - `onfocus` delegates focus to the actual input for a seamless tabbing experience.
  - `onkeydown` makes the clickable wrapper keyboard-accessible, satisfying a11y linter rules.
-->
<div
  class="tag-input-wrapper"
  role="listbox"
  aria-label="Tags list and input"
  tabindex="0"
  onclick={() => inputElement.focus()}
  onfocus={() => inputElement.focus()}
  onkeydown={(e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputElement.focus();
    }
  }}
>
  {#each tags as tag, i (tag)}
    <!-- 
      A11Y ENHANCEMENT:
      - `role="option"` identifies each tag as an item in the listbox.
      - `aria-selected` is a required attribute for `role="option"`.
    -->
    <span
      class="tag-pill"
      role="option"
      class:highlight-for-deletion={isDeletingLastTag && i === tags.length - 1}
      aria-selected={isDeletingLastTag && i === tags.length - 1}
    >
      {tag}
      <button
        type="button"
        class="remove-tag-btn"
        onclick={(e) => {
          e.stopPropagation();
          removeTag(i);
        }}
        aria-label={`Remove ${tag}`}
      >
        <Icon name="x" size={14} />
      </button>
    </span>
  {/each}

  <input
    type="text"
    {id}
    {...rest}
    bind:this={inputElement}
    bind:value={inputValue}
    onkeydown={handleKeyDown}
    onpaste={handlePaste}
    onblur={() => (isDeletingLastTag = false)}
    class="tag-input-native"
  />
</div>

<style>
  /* All styles remain the same and are correct. */
  .tag-input-wrapper {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
    width: 100%;
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid var(--color-border-input);
    border-radius: var(--border-radius-md);
    background-color: var(--color-background);
    transition: var(--transition-fast);
    cursor: text;
    outline: none;
  }
  .tag-input-wrapper:focus-within,
  .tag-input-wrapper:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px hsl(var(--color-accent-hsl) / 0.3);
  }
  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    background-color: var(--color-gray-100);
    color: var(--color-text);
    font-size: 0.875rem;
    font-weight: 500;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-md);
    transition: all 0.2s ease;
  }
  .remove-tag-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-gray-400);
    color: var(--color-background);
    border: none;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    cursor: pointer;
    opacity: 0.7;
    transition: var(--transition-fast);
  }
  .remove-tag-btn:hover {
    opacity: 1;
    background-color: var(--color-gray-600);
    transform: scale(1.1);
  }
  .tag-pill.highlight-for-deletion {
    background-color: var(--color-danger-bg);
    color: var(--color-danger-text);
    box-shadow: 0 0 0 2px var(--color-danger);
  }
  .tag-input-native {
    flex-grow: 1;
    border: none;
    background: none;
    outline: none;
    padding: var(--space-xs);
    font-size: 0.95rem;
    min-width: 120px;
    color: var(--color-text);
  }
  :global(.dark-theme) .tag-input-wrapper {
    background-color: var(--color-background-dark);
    border-color: var(--color-border-input-dark);
  }
  :global(.dark-theme) .tag-pill {
    background-color: var(--color-gray-700);
    color: var(--color-text-dark);
  }
  :global(.dark-theme) .remove-tag-btn {
    background-color: var(--color-gray-500);
    color: var(--color-background-dark);
  }
  :global(.dark-theme) .remove-tag-btn:hover {
    background-color: var(--color-gray-400);
  }
  :global(.dark-theme) .tag-input-native {
    color: var(--color-text-dark);
  }
</style>
