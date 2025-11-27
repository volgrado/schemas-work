<!--
  @component
  ViewHeader

  @description
  A standardized navigation header for Command Bar sub-views (e.g., "AI Actions", "File Explorer").

  Features:
  - **Consistent Layout:** Title on the left, optional back button, and a slot for right-aligned actions.
  - **Accessibility:** Back button is semantic and labeled.
  - **Theming:** Adapts to light/dark modes via CSS variables.

  @props
  - `title` (string): The text to display in the header.
  - `onBack` (function | undefined): If provided, renders a back button that triggers this callback.
  - `children` (snippet): Slot for rendering additional action buttons (e.g., "New Folder") on the right.
-->
<script lang="ts">
  import Icon from '$lib/core/ui/Icon.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';

  const { title, onBack, children } = $props<{
    title: string;
    onBack?: () => void;
    children?: import('svelte').Snippet;
  }>();
</script>

<header class="view-header">
  <div class="header-left">
    {#if onBack}
      <button
        class="back-button"
        onclick={onBack}
        aria-label={i18n.t('common.back')}
      >
        <Icon name="arrow-left" size={18} />
      </button>
    {/if}
    <h2 class="view-title">{title}</h2>
  </div>

  <!-- Right-aligned action buttons -->
  <div class="header-actions">
    {@render children?.()}
  </div>
</header>

<style>
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px 12px 14px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .view-title {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .back-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    transition: var(--transition-fast);
  }

  .back-button:hover {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }

  :global(.dark-theme) .view-header {
    border-color: var(--panel-border-dark);
  }
</style>
