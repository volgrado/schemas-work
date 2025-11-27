<script lang="ts">
  interface Props {
    onResize: (delta: number) => void;
    onResizeStart?: () => void;
    onResizeEnd?: () => void;
  }

  const { onResize, onResizeStart, onResizeEnd }: Props = $props();

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault(); // Prevent text selection
    onResizeStart?.();

    const startX = e.clientX;

    function onMouseMove(e: MouseEvent) {
      // Calculate delta from start position
      const deltaX = startX - e.clientX;
      onResize(deltaX);
    }

    function onMouseUp() {
      onResizeEnd?.();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="resize-handle"
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize panel"
  onmousedown={handleMouseDown}
></div>

<style>
  /* Resize Handle */
  .resize-handle {
    position: absolute;
    left: -8px;
    top: 0;
    bottom: 0;
    width: 16px;
    cursor: col-resize;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center; /* Center the grip handle */
    pointer-events: auto;
  }

  /* Hover area background */
  .resize-handle:hover,
  .resize-handle:active {
    background: linear-gradient(to right, rgba(0, 0, 0, 0.05), transparent);
  }

  /* The vertical line indicator */
  .resize-handle::before {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: var(--color-border); /* Always visible line */
    transition: all 0.2s;
  }

  .resize-handle:hover::before,
  .resize-handle:active::before {
    background-color: var(--color-accent);
    width: 2px;
  }

  /* The grip handle (pill) */
  .resize-handle::after {
    content: '';
    width: 4px;
    height: 48px;
    background-color: var(--color-border);
    border-radius: 0 4px 4px 0;
    margin-left: 0; /* Attached to left edge */
    transition: background-color 0.2s;
    box-shadow: 1px 0 2px rgba(0, 0, 0, 0.1);
  }

  .resize-handle:hover::after,
  .resize-handle:active::after {
    background-color: var(--color-accent);
  }
</style>
