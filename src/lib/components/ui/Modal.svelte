<!--
  @component
  Modal

  This component provides a flexible and accessible modal dialog, which is used to
  display content that requires interrupting the user's workflow. It includes a
  translucent overlay, smooth transitions, and multiple ways to close.

  Key Features:
  - Controlled by a `show` prop for easy state management from the parent component.
  - A semi-transparent backdrop overlay that can be clicked to close the modal.
  - Closes when the user presses the 'Escape' key, providing a standard UX pattern.
  - An optional header with a title and an explicit close button for clarity.
  - Smooth `fade` and `fly` transitions for the overlay and panel, enhancing the UI feel.
  - Follows accessibility best practices using `role="dialog"`, `aria-modal`, and `aria-label`.

  Props:
  - `show`: {boolean} - Controls the visibility of the modal. Bind to this prop from the parent.
  - `title`: {string | null} - An optional string for the modal's header title. If provided, the header is displayed.
  - `onClose`: {() => void} - A required callback function that is invoked when the modal is requested to be closed.

  Slots:
  - `default`: The main content of the modal is passed into this slot.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';

  /** @prop {boolean} [show=false] - Controls the visibility of the modal. */
  export let show: boolean = false;
  /** @prop {string | null} [title=null] - The title displayed in the modal's header. */
  export let title: string | null = null;
  /** @prop {() => void} onClose - The callback function to close the modal. */
  export let onClose: () => void;

  /**
   * A wrapper function that calls the `onClose` prop.
   * This provides a consistent internal API for closing the modal.
   */
  function close() {
    onClose();
  }

  /**
   * Handles the keydown event to close the modal on 'Escape'.
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
    }
  }

  // Add and remove the global keydown listener when the component is mounted and destroyed.
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if show}
  <!-- 
    The overlay covers the entire viewport, providing focus to the modal.
    Clicking it will trigger the close function.
  -->
  <div
    class="modal-overlay"
    on:click={close}
    transition:fade={{ duration: 150 }}
    aria-label={t('modal.close_aria_label')}
  ></div>

  <!-- 
    The main modal panel. `role="dialog"` and `aria-modal="true"` are crucial for accessibility.
    It traps focus and is announced by screen readers.
  -->
  <div
    class="modal-panel"
    role="dialog"
    aria-modal="true"
    aria-label={title || t('modal.default_aria_label')}
    transition:fly={{ y: 20, duration: 200 }}
  >
    <!-- The header is only rendered if a title is provided. -->
    {#if title}
      <header class="modal-header">
        <h2 class="modal-title">{title}</h2>
        <button
          class="modal-close-button"
          on:click={close}
          aria-label={t('modal.close_aria_label')}
        >
          <Icon name="x" size={20} />
        </button>
      </header>
    {/if}

    <!-- The main content area, populated by the default slot. -->
    <main class="modal-content">
      <slot />
    </main>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px); /* Creates a modern, frosted glass effect. */
    z-index: 199; /* Below the modal panel, but above everything else. */
  }

  .modal-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 200;
    width: 90vw;
    max-width: 500px;
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--space-md);
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    max-height: 85vh; /* Prevents the modal from being too tall on any screen. */
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0; /* Prevents the header from shrinking if content overflows. */
  }

  .modal-title { margin: 0; font-size: 1.1rem; font-weight: 600; }

  .modal-close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-gray-500);
    transition: background-color 0.2s, color 0.2s;
  }

  .modal-close-button:hover { background-color: var(--color-gray-100); color: var(--color-text); }

  .modal-content { padding: var(--space-lg); overflow-y: auto; }

  @media (prefers-color-scheme: dark) {
    .modal-panel {
      background-color: var(--color-background-dark-raised);
      border-color: var(--color-border-dark);
    }
    .modal-header { border-color: var(--color-border-dark); }
    .modal-close-button:hover {
      background-color: var(--color-gray-800);
      color: var(--color-text-dark);
    }
  }
</style>
