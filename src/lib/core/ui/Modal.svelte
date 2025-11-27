<!-- src/lib/components/ui/Modal.svelte (Final Corrected Version) -->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { TransitionConfig } from 'svelte/transition';
  import Icon from '$lib/core/ui/Icon.svelte';
  import { i18n } from '$lib/utils/i18n.svelte';
  import { focusTrap } from '$lib/actions/focusTrap';

  export type ModalWidth = 'sm' | 'default' | 'lg' | 'xl';

  type FlyAndScaleParams = { y: number; duration: number };

  let {
    show = $bindable(false),
    title = null,
    onClose,
    onBack = null,
    showOverlay = true,
    width = 'default',
    children,
  } = $props<{
    show?: boolean;
    title: string | null;
    onClose: () => void;
    onBack?: (() => void) | null;
    showOverlay?: boolean;
    width?: ModalWidth;
    children?: import('svelte').Snippet;
  }>();

  // All modals are now 640px to match CommandBar
  let panelClass = 'modal-panel';
  let modalPanel = $state<HTMLDivElement | null>(null);
  let modalOverlay = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (show) {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeydown);
        document.body.style.overflow = '';
      };
    }
  });

  const flyAndScale = (
    node: Element,
    params: FlyAndScaleParams
  ): TransitionConfig => {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;
    return {
      ...params,
      css: (t: number, u: number) => `
        transform: ${transform} scale(${t}) translateY(${u * params.y}px);
        opacity: ${t};
      `,
    };
  };
</script>

{#if show}
  {#if showOverlay}
    <div
      bind:this={modalOverlay}
      class="modal-overlay"
      onclick={onClose}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClose();
      }}
      transition:fade={{ duration: 250 }}
      aria-label={i18n.t('modal.close_aria_label')}
      role="button"
      tabindex="0"
    ></div>
  {/if}
  <!-- THE FIX: Changed `{if}` to `{/if}` -->

  <div
    bind:this={modalPanel}
    class={panelClass}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
    transition:flyAndScale={{ y: 20, duration: 300 }}
    use:focusTrap={true}
  >
    {#if title}
      <header class="modal-header">
        <div class="modal-header-left">
          {#if onBack}
            <button
              class="modal-back-button"
              onclick={onBack}
              aria-label={i18n.t('modal.back_aria_label')}
            >
              <Icon name="arrow-left" size={20} />
            </button>

          {/if}
          <h2 class="modal-title" id="modal-title">{title}</h2>
        </div>
        <button
          class="modal-close-button"
          onclick={onClose}
          aria-label={i18n.t('modal.close_aria_label')}
        >
          <Icon name="x" size={20} />
        </button>
      </header>
    {/if}

    <main class="modal-content">
      {@render children?.()}
    </main>
  </div>
{/if}

<style>
  /* Styles remain the same */
  .modal-overlay {
    position: fixed;
    inset: 0;
    /* Use the glass-overlay variable or class directly if possible, but here we map to the variable */
    background-color: rgba(0, 0, 0, 0.4); /* Fallback */
    z-index: var(--z-modal-overlay);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    transition: opacity var(--duration-base) var(--ease-out);
  }
  
  /* Apply glass-overlay styles via @apply or just use the class in markup. 
     Since we can't use @apply without PostCSS config, we'll manually sync with glassmorphism.css 
     OR better, we update the markup to use the global class. 
     For now, let's use the variables defined in glassmorphism.css if they are globally available.
  */
  
  .modal-overlay:focus-visible {
    outline: 2px solid var(--color-accent);
  }

  .modal-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: var(--z-modal-panel);
    width: 100%;
    max-width: 640px;
    
    /* Premium Glassmorphism - using variables from glassmorphism.css */
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);

    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    outline: none;
  }

  /* Mobile: slide from bottom like phone apps */
  @media (max-width: 640px) {
    .modal-panel {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      transform: none;
      width: 100%;
      max-width: 100%;
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      max-height: 90vh;
    }
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .modal-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex: 1;
  }
  .modal-back-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    transition: var(--transition-fast);
  }
  .modal-back-button:hover {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }
  .modal-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
  }
  .modal-close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    transition: var(--transition-fast);
  }
  .modal-close-button:hover {
    background-color: var(--btn-hover-bg);
    color: var(--color-text);
  }
  .modal-content {
    padding: var(--space-lg);
    overflow-y: auto;
  }
</style>
