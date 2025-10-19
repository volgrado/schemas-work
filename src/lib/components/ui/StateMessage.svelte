<!--
@component
A reusable component for displaying loading, error, or empty states.
This centralizes the markup and styling for these common UI patterns,
ensuring consistency across the application.

@props {string} type - The type of state to display ('loading', 'error', 'empty').
@props {string} [title=''] - An optional title for the message. Defaults to a context-appropriate title.
@props {string} [message=''] - An optional descriptive message. Defaults to a context-appropriate message.

@slot - Content for this slot will be rendered inside the component when the type is 'empty',
       allowing for custom content like action buttons.
-->
<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { IconName } from '$lib/types/iconName';

  type StateType = 'loading' | 'error' | 'empty';
  let {
    type,
    title = '',
    message = '',
  }: {
    type: StateType;
    title?: string;
    message?: string;
  } = $props();

  // Derive the appropriate icon based on the state type
  let iconName: IconName = $derived(
    type === 'loading' ? 'loader' : type === 'error' ? 'alert-triangle' : 'info' // Default icon for the 'empty' state
  );

  // Provide default titles if none are passed in props
  let defaultTitle = $derived(
    type === 'loading'
      ? 'Loading...'
      : type === 'error'
        ? 'Error'
        : 'Nothing here yet'
  );

  // Provide default messages if none are passed in props
  let defaultMessage = $derived(
    type === 'loading'
      ? 'Please wait a moment.'
      : type === 'error'
        ? 'Something went wrong.'
        : ''
  );
</script>

<div class="state-message {type}" role="status">
  <Icon
    name={iconName}
    size={type === 'loading' ? 24 : 32}
    class={type === 'loading' ? 'spinner' : ''}
  />
  {#if title || defaultTitle}
    <h3>{title || defaultTitle}</h3>
  {/if}
  {#if message || defaultMessage}
    <p>{message || defaultMessage}</p>
  {/if}
  {#if type === 'empty'}
    <slot />
    <!-- Allows for custom content, like buttons, in the empty state -->
  {/if}
</div>

<style>
  .state-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    padding: var(--space-xl);
    text-align: center;
    color: var(--color-text-secondary);
    min-height: 150px;
    box-sizing: border-box;
    width: 100%;
  }
  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
  }
  p {
    margin: 0;
    font-size: 0.9rem;
    max-width: 300px;
  }
  .error {
    color: var(--color-danger);
  }
  .error h3 {
    color: var(--color-danger);
  }

  /* Note: The .spinner class relies on a global animation defined in app.css */

  /* --- Dark Mode --- */
  :global(.dark-theme) .state-message {
    color: var(--color-text-dark-secondary);
  }
  :global(.dark-theme) h3 {
    color: var(--color-text-dark);
  }
  :global(.dark-theme) .error {
    color: var(--color-danger);
  }
  :global(.dark-theme) .error h3 {
    color: var(--color-danger);
  }
</style>
