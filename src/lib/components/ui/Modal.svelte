<!-- src/lib/components/ui/Modal.svelte (Final Corrected Version) -->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import type { TransitionConfig } from 'svelte/transition';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { t } from '$lib/utils/i18n';

  export type ModalWidth = 'sm' | 'default' | 'lg' | 'xl';

  type FlyAndScaleParams = { y: number; duration: number };

  let {
    show = $bindable(false),
    title = null,
    onClose,
    showOverlay = true,
    width = 'default',
    children,
  } = $props<{
    show?: boolean;
    title: string | null;
    onClose: () => void;
    showOverlay?: boolean;
    width?: ModalWidth;
    children?: any;
  }>();

  const sizeClasses: Record<ModalWidth, string> = {
    sm: 'max-w-md',
    default: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  const getPanelClass = (w: ModalWidth): string => {
    return `modal-panel ${sizeClasses[w]}`;
  };

  let panelClass = $derived(getPanelClass(width));
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

  $effect(() => {
    if (show && modalPanel) {
      const focusableElements = [
        ...(modalOverlay ? [modalOverlay] : []),
        ...Array.from(
          modalPanel.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ),
      ];
      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      firstElement?.focus();
      const handleFocusTrap = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        }
      };
      window.addEventListener('keydown', handleFocusTrap);
      return () => {
        window.removeEventListener('keydown', handleFocusTrap);
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
      aria-label={$t('modal.close_aria_label')}
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
  >
    {#if title}
      <header class="modal-header">
        <h2 class="modal-title" id="modal-title">{title}</h2>
        <button
          class="modal-close-button"
          onclick={onClose}
          aria-label={$t('modal.close_aria_label')}
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
    background-color: var(--overlay-bg);
    z-index: var(--z-modal-overlay);
  }
  .modal-overlay:focus-visible {
    outline: 2px solid var(--color-accent);
  }
  .modal-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: var(--z-modal-panel);
    width: 90vw;
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--space-md);
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .modal-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
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
    color: var(--color-gray-500);
    transition:
      background-color 0.2s,
      color 0.2s;
  }
  .modal-close-button:hover {
    background-color: var(--color-gray-100);
    color: var(--color-text);
  }
  .modal-content {
    padding: var(--space-lg);
    overflow-y: auto;
  }
  :global(.dark-theme) .modal-overlay {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  :global(.dark-theme) .modal-panel {
    background-color: var(--color-background-dark-raised);
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .modal-header {
    border-color: var(--color-border-dark);
  }
  :global(.dark-theme) .modal-close-button:hover {
    background-color: var(--color-gray-800);
    color: var(--color-text-dark);
  }
</style>
