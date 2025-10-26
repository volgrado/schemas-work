<!-- src/lib/components/ui/PieChart.svelte -->
<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  type PieSliceData = {
    value: number;
    label: string;
    color: string;
  };

  const { data } = $props<{ data: PieSliceData[] }>();

  const animatedData = tweened(data, { duration: 600, easing: cubicOut });
  $effect(() => {
    animatedData.set(data);
  });

  const pie = $derived(() => {
    // --- FIX 1: Add explicit types for the reduce function parameters ---
    const total = $animatedData.reduce(
      (sum: number, d: PieSliceData) => sum + d.value,
      0
    );
    if (total === 0) return [];

    const slices = [];
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
        path: getArcPath(startAngle, endAngle, slice.value / total > 0.5),
      });
    }
    return slices;
  });

  function getArcPath(
    startAngle: number,
    endAngle: number,
    isLargeArc: boolean
  ): string {
    const startX = Math.cos(startAngle);
    const startY = Math.sin(startAngle);
    const endX = Math.cos(endAngle);
    const endY = Math.sin(endAngle);
    const largeArcFlag = isLargeArc ? 1 : 0;

    return `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  }
</script>

<div class="pie-chart-container">
  <svg viewBox="-1.1 -1.1 2.2 2.2" class="pie">
    <!-- --- FIX 2: Call the derived signal as a function --- -->
    {#each pie() as slice}
      <path d={slice.path} fill={slice.color}>
        <title>{slice.label}: {slice.value}</title>
      </path>
    {/each}
  </svg>
  <div class="legend">
    {#each data as item}
      <div class="legend-item">
        <div class="legend-color" style="background-color: {item.color}"></div>
        <span class="legend-label">{item.label} ({item.value})</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .pie-chart-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-lg);
    width: 100%;
    height: 100%;
  }
  .pie {
    width: 150px;
    height: 150px;
    flex-shrink: 0;
  }
  .pie path {
    stroke: var(--color-background);
    stroke-width: 0.03;
    transition: transform 0.2s ease-out;
  }
  .pie path:hover {
    transform: scale(1.05);
  }
  .legend {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
  .legend-label {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }
</style>
