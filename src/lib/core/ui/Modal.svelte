<!--
  @component
  Modal

  @description
  A robust, accessible, and animated modal dialog component.
  It serves as the foundation for all dialog interactions in the application (e.g., API keys, Password prompts).

  Features:
  - **Accessibility:** Implements a focus trap (`use:focusTrap`) to keep keyboard navigation within the modal.
  - **Animations:** Uses a custom `flyAndScale` transition for a premium "pop" effect.
  - **Responsive:** Adapts to a bottom-sheet style on mobile devices.
  - **Glassmorphism:** Leverages the global glass design tokens for the background and border.
  - **Shortcuts:** Closes on `Escape` key press.

  @props
  - `show` (bindable boolean): Controls the visibility of the modal.
  - `title` (string | null): The header title of the modal.
  - `onClose` (function): Callback triggered when the modal should close (overlay click, close button, escape).
  - `onBack` (function | null): Optional callback to show a back button in the header.
  - `showOverlay` (boolean): Whether to render the backdrop overlay. Default: `true`.
  - `width` (string): [Deprecated] The width is now standardized to match the CommandBar (640px max).
-->
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
    alignment = 'center',
    children,
  } = $props<{
    show?: boolean;
    title: string | null;
    onClose: () => void;
    onBack?: (() => void) | null;
    showOverlay?: boolean;
    width?: ModalWidth;
    alignment?: 'center' | 'top';
    children?: import('svelte').Snippet;
  }>();

  const panelClass = 'modal-panel';
  let modalPanel = $state<HTMLDivElement | null>(null);
  let modalOverlay = $state<HTMLDivElement | null>(null);

  // Swipe to Close Logic
  let startY = $state(0);
  let currentY = $state(0);
  let isDragging = $state(false);

  function handleTouchStart(e: TouchEvent) {
    // Only enable swipe on mobile
    if (window.innerWidth > 640) return;
    
    // Only start if we are at the top of the scroll (if content is scrollable)
    // For simplicity, we attach this to the header, so it's always safe.
    startY = e.touches[0].clientY;
    isDragging = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    const y = e.touches[0].clientY;
    const delta = y - startY;
    
    // Only allow dragging down
    if (delta > 0) {
      currentY = delta;
      e.preventDefault(); // Prevent scrolling while dragging
    }
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;

    if (currentY > 100) { // Threshold to close
      onClose();
    } else {
      // Snap back
      currentY = 0;
    }
  }

  // Effect: Handle global Escape key to close the modal
  $effect(() => {
    if (show) {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeydown);
      // Prevent scrolling of the body content while modal is open
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeydown);
        document.body.style.overflow = '';
      };
    }
  });

  /**
   * Custom transition that combines a vertical fly with a slight scale effect.
   */
  const flyAndScale = (
    node: Element,
    params: FlyAndScaleParams
  ): TransitionConfig => {
    const style = getComputedStyle(node);
    const transform = style.transform === 'none' ? '' : style.transform;
    
    // Check if we are on mobile (matching the CSS breakpoint)
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    if (isMobile) {
      return {
        duration: params.duration,
        css: (t: number) => `
          transform: ${transform} translateY(${(1 - t) * 100}%);
        `
      };
    }

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
  <!-- Backdrop Overlay -->
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

  <!-- Modal Panel -->
  <div
    bind:this={modalPanel}
    class="{panelClass} {alignment} {width}"
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
    transition:flyAndScale={{ y: 20, duration: 300 }}
    use:focusTrap={true}
    style:transform={currentY > 0 ? `translateY(${currentY}px)` : undefined}
    style:transition={isDragging ? 'none' : 'transform 0.3s ease-out'}
  >
    <!-- Mobile Drag Handle -->
    <div 
      class="drag-handle-area"
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    >
      <div class="drag-handle"></div>
    </div>

    {#if title}
      <header 
        class="modal-header"
        ontouchstart={handleTouchStart}
        ontouchmove={handleTouchMove}
        ontouchend={handleTouchEnd}
      >
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
  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: var(--z-modal-overlay);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    transition: opacity var(--duration-base) var(--ease-out);
  }

  .modal-overlay:focus-visible {
    outline: 2px solid var(--color-accent);
  }

  .modal-panel {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 100%;
    /* Default max-width, overridden by variants */
    max-width: 640px;

    /* Premium Glassmorphism */
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);

    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
    min-height: 100px; /* Prevent collapse */
    outline: none;
  }

  /* Width Variants */
  .modal-panel :global(.sm) { max-width: 480px; }
  .modal-panel :global(.default) { max-width: 640px; }
  .modal-panel :global(.lg) { max-width: 896px; } /* 32rem * 1.75? No, 896px is standard lg */
  .modal-panel :global(.xl) { max-width: 1024px; }

  /* Since the class is applied to the element itself, we don't need :global if we use the class name directly in the selector list if it was separate. 
     But here .modal-panel has the class. So: */
  .modal-panel.sm { max-width: 480px; }
  .modal-panel.default { max-width: 640px; }
  .modal-panel.lg { max-width: 896px; }
  .modal-panel.xl { max-width: 1024px; }

  .modal-panel.center {
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .modal-panel.top {
    top: 15%;
    max-height: 80vh;
  }

  /* Drag Handle Styles */
  .drag-handle-area {
    display: none; /* Hidden on desktop */
    width: 100%;
    height: 20px;
    justify-content: center;
    align-items: center;
    cursor: grab;
    flex-shrink: 0;
  }

  .drag-handle {
    width: 40px;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
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

    .drag-handle-area {
      display: flex;
    }
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    touch-action: none; /* Prevent scrolling on header */
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
