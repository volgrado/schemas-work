<!-- src/lib/components/ui/PieChart.svelte -->
<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Popup from '$lib/components/ui/Popup.svelte';

  type PieSliceData = {
    value: number;
    label: string;
    color: string;
  };

  // --- Derived type definitions ---
  // This is deferred until `pie` is declared
  type PieSlice = ReturnType<typeof pie>['slices'][number];

  type TooltipData = {
    isVisible: boolean;
    label: string;
    value: number;
    percent: number;
    color: string;
    getReferenceClientRect: () => DOMRect;
  };

  // --- Props ---
  const {
    data,
    innerRadius = 0.6,
    children,
  } = $props<{ data: PieSliceData[]; innerRadius?: number; children?: any }>();

  // --- State ---
  const animatedData = tweened(data, { duration: 700, easing: cubicOut });
  let highlightedLabel = $state<string | null>(null);
  let tooltip = $state<TooltipData | null>(null);

  $effect(() => {
    animatedData.set(data);
  });

  // --- Derived Signal ---
  const pie = $derived(() => {
    const total = $animatedData.reduce(
      (sum: number, d: PieSliceData) => sum + d.value,
      0
    );
    if (total === 0) return { total, slices: [] };

    const slices: ({
      startAngle: number;
      endAngle: number;
      percent: number;
      path: string;
    } & PieSliceData)[] = [];
    let cumulativeAngle = -Math.PI / 2;

    for (const slice of $animatedData) {
      const angle = (slice.value / total) * 2 * Math.PI;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      const endAngle = cumulativeAngle;

      slices.push({
        ...slice,
        startAngle,
        endAngle,
        percent: (slice.value / total) * 100,
        path: getArcPath(startAngle, endAngle, innerRadius),
      });
    }
    return { total, slices };
  });

  function getArcPath(
    startAngle: number,
    endAngle: number,
    innerR: number
  ): string {
    const isLargeArc = endAngle - startAngle > Math.PI;
    const largeArcFlag = isLargeArc ? 1 : 0;
    const startXOuter = Math.cos(startAngle),
      startYOuter = Math.sin(startAngle);
    const endXOuter = Math.cos(endAngle),
      endYOuter = Math.sin(endAngle);
    const startXInner = Math.cos(startAngle) * innerR,
      startYInner = Math.sin(startAngle) * innerR;
    const endXInner = Math.cos(endAngle) * innerR,
      endYInner = Math.sin(endAngle) * innerR;

    return `M ${startXOuter} ${startYOuter} A 1 1 0 ${largeArcFlag} 1 ${endXOuter} ${endYOuter} L ${endXInner} ${endYInner} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${startXInner} ${startYInner} Z`;
  }

  function handleMouseOver(slice: PieSlice, event: MouseEvent) {
    highlightedLabel = slice.label;
    tooltip = {
      isVisible: true,
      ...slice,
      getReferenceClientRect: () =>
        DOMRect.fromRect({
          width: 0,
          height: 0,
          x: event.clientX,
          y: event.clientY,
        }),
    };
  }

  function handleMouseLeave() {
    highlightedLabel = null;
    tooltip = null;
  }

  function handleKeyDown(event: KeyboardEvent, label: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      highlightedLabel = highlightedLabel === label ? null : label;
    }
  }
</script>

<div
  class="pie-chart-container"
  role="figure"
  aria-label="Pie chart showing data distribution"
>
  <div class="chart-wrapper">
    <svg viewBox="-1.1 -1.1 2.2 2.2" class="pie">
      {#each pie().slices as slice (slice.label)}
        <path
          d={slice.path}
          fill={slice.color}
          class="slice"
          class:highlighted={highlightedLabel === slice.label}
          onmouseenter={(e) => handleMouseOver(slice, e)}
          onmouseleave={handleMouseLeave}
          role="option"
          aria-label={`${slice.label}: ${slice.value}`}
          tabindex="0"
        />
      {/each}
    </svg>
    <div class="center-slot">
      {#if children}
        {@render children({ total: pie().total })}
      {:else}
        <div class="total-value">{pie().total.toLocaleString()}</div>
        <div class="total-label">Total</div>
      {/if}
    </div>
  </div>

  <div class="legend" role="listbox">
    {#each data as item (item.label)}
      <div
        class="legend-item"
        class:highlighted={highlightedLabel === item.label}
        onmouseenter={() => (highlightedLabel = item.label)}
        onmouseleave={() => (highlightedLabel = null)}
        onkeydown={(e) => handleKeyDown(e, item.label)}
        role="option"
        aria-selected={highlightedLabel === item.label}
        tabindex="0"
      >
        <div class="legend-color" style="background-color: {item.color}"></div>
        <span class="legend-label">{item.label}</span>
        <span class="legend-value">{item.value.toLocaleString()}</span>
      </div>
    {/each}
  </div>
</div>

{#if tooltip}
  <Popup
    isVisible={tooltip.isVisible}
    getReferenceClientRect={tooltip.getReferenceClientRect}
    placement="top"
    offsetValue={12}
  >
    <div class="tooltip-content">
      <div class="tooltip-header">
        <div
          class="legend-color"
          style="background-color: {tooltip.color}"
        ></div>
        <strong>{tooltip.label}</strong>
      </div>
      <div class="tooltip-body">
        {tooltip.value.toLocaleString()} ({tooltip.percent.toFixed(1)}%)
      </div>
    </div>
  </Popup>
{/if}

<style>
  /* Styles remain the same */
  .pie-chart-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xl);
    width: 100%;
    height: 100%;
    font-family: var(--font-main);
  }
  .chart-wrapper {
    position: relative;
    width: 170px;
    height: 170px;
    flex-shrink: 0;
  }
  .pie {
    width: 100%;
    height: 100%;
    animation: fadeInScale 0.6s cubic-bezier(0.25, 1, 0.5, 1) both;
  }
  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .slice {
    stroke: var(--color-background);
    stroke-width: 0.03;
    transition: transform 0.2s cubic-bezier(0.5, 1.5, 0.5, 1);
    transform-origin: center;
    cursor: pointer;
  }
  .slice:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-radius: 5px;
  }
  .slice.highlighted,
  .slice:hover {
    transform: scale(1.06);
  }
  .center-slot {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    pointer-events: none;
  }
  .total-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }
  .total-label {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .legend {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .legend-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--border-radius-md);
    transition:
      background-color 0.2s ease,
      transform 0.2s ease;
    cursor: pointer;
  }
  .legend-item:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  .legend-item.highlighted {
    background-color: var(--btn-hover-bg);
    transform: translateX(4px);
  }
  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
  .legend-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  .legend-value {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
    font-family: var(--font-mono);
  }
  .tooltip-content {
    background-color: var(--color-background-raised);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
    font-size: 0.9rem;
  }
  .tooltip-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-xs);
  }
  .tooltip-body {
    color: var(--color-text-secondary);
  }
</style>
