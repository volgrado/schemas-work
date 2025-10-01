<!-- src/lib/components/ui/FloatingActionButton.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  // *** LA MEJORA ***
  // Importamos nuestro nuevo tipo estricto
  import type { IconName } from '$lib/types/iconName';

  // Props que el botón acepta
  // Ahora, TypeScript se quejará si intentamos pasar un nombre de icono que no existe.
  export let icon: IconName;
  export let label: string;
  export let position: 'center' | 'right' | 'left' = 'center';

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('click');
  }
</script>

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
    <Icon name={icon} size={20} />
    <span class="button-text">{label}</span>
  </Button>
</div>

<style>
  .fab-wrapper {
    position: fixed;
    bottom: var(--space-lg);
    z-index: 40;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-radius: var(--space-sm);
  }

  /* Posicionamiento */
  .center {
    left: 50%;
    transform: translateX(-50%);
  }
  .right {
    right: var(--space-lg);
  }

  .left {
    left: var(--space-lg);
  }

  :global(.fab-wrapper button) {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.1),
      0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .button-text {
    margin-left: var(--space-xs);
    font-weight: 600;
  }
</style>
