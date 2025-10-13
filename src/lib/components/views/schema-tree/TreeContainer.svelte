<!-- src/lib/components/views/schema-tree/TreeContainer.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  let svgEl: SVGSVGElement | undefined;

  onMount(() => {
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const g = svg.append('g').attr('class', 'content-group');

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));
    svg.call(zoomBehavior).on('dblclick.zoom', null);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries?.[0]) return;
      const height = entries[0].contentRect.height;
      const initialTransform = d3.zoomIdentity.translate(80, height / 2);
      svg.call(zoomBehavior.transform, initialTransform);
    });

    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });
</script>

<div class="tree-container" role="tree" aria-label="Visualización del esquema">
  <svg bind:this={svgEl} class="tree-svg" />
</div>

<style>
  .tree-container,
  .tree-svg {
    width: 100%;
    height: 100%;
    display: block;
    background-color: var(--color-background);
    cursor: grab;
  }
  .tree-container:active {
    cursor: grabbing;
  }
</style>
