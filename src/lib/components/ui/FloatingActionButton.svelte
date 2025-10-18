<!--
  @component
  FloatingActionButton (FAB)

  This component creates a prominent, floating button that remains fixed at the
  bottom of the viewport. It's designed for a primary or contextual action that
  should be easily accessible to the user, such as creating a new item,
  starting a process, or initiating a search.

  Key Features:
  - Stays fixed at the bottom of the screen, floating above other content.
  - Configurable horizontal alignment (`center`, `left`, or `right`).
  - Smooth `fly` transition on mount for a gentle entrance.
  - Combines an icon and a text label for a clear, understandable action.
  - Built on top of the base `Button` component, ensuring visual consistency.
  - Uses a type-safe `IconName` prop, preventing invalid icon names at compile time.

  Props:
  - `icon`: {IconName} - The name of the icon to display. Must be a valid `IconName`.
  - `label`: {string} - The text label for the button. Also used as the `aria-label` for accessibility.
  - `position`: {'center' | 'right' | 'left'} - The horizontal alignment of the button. Defaults to 'center'.

  Events:
  - `click`: Fired when the user clicks the button. The event is forwarded from the underlying button.
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // By importing a strict IconName type, TypeScript can enforce valid icon names.
  import type { IconName } from '$lib/types/iconName';

  // --- Props ---
  /** @prop {IconName} icon - The name of the icon to display. */
  export let icon: IconName;
  /** @prop {string} label - The text label for the button. */
  export let label: string;
  /** @prop {'center' | 'right' | 'left'} [position='center'] - The horizontal alignment. */
  export let position: 'center' | 'right' | 'left' = 'center';

  const dispatch = createEventDispatcher();

  /**
   * Forwards the click event to the parent component.
   */
  function handleClick(event: MouseEvent) {
    dispatch('click', event);
  }
</script>

<!--
  The wrapper element controls the positioning and transition of the FAB.
  The `position` prop is used to apply the correct alignment class.
-->
<div
  class="fab-wrapper"
  class:center={position === 'center'}
  class:right={position === 'right'}
  class:left={position === 'left'}
  transition:fly={{ y: 20, duration: 300, easing: quintOut }}
>
  <Button
    on:click={handleClick}
    variant="secondary"
    size="md"
    aria-label={label}
  >
    <Icon {icon} size={20} />
    <span>{label}</span>
  </Button>
</div>

<style>
  .fab-wrapper {
    position: fixed;
    bottom: var(--space-lg);
    z-index: 40; /* Positioned above content but below modals. */
    /* Adds a subtle blur to content scrolling behind the button. */
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: var(--space-sm);
  }

  /* --- Positioning Classes --- */
  .center { left: 50%; transform: translateX(-50%); }
  .right { right: var(--space-lg); }
  .left { left: var(--space-lg); }

  /* 
    Apply a more prominent shadow to the button inside the FAB wrapper.
    We use :global() because the button is a child component.
  */
  :global(.fab-wrapper button) {
    box-shadow: var(--shadow-md);
  }

  /* Dark Mode Styles */
  @media (prefers-color-scheme: dark) {
    /* 
      In dark mode, the button itself has a dark background. The backdrop-filter
      is less effective without a semi-transparent background on the wrapper.
    */
    .fab-wrapper {
      background-color: hsla(var(--color-background-dark-hsl), 0.1);
    }

    :global(.fab-wrapper button) {
      box-shadow: var(--shadow-dark-md);
    }
  }
</style>
