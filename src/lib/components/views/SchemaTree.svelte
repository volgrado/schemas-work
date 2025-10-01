<!-- src/lib/components/views/SchemaTree.svelte (VERSIÓN SIMPLE Y ROBUSTA) -->

<script module lang="ts">
  // Este tipo es usado por `+page.svelte` y el `schemaService`
  export interface TreeNodeData {
    id: string;
    content: string;
    children?: TreeNodeData[];
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { createEventDispatcher } from 'svelte';

  let {
    treeData,
    selectedNodeId,
  }: {
    treeData: TreeNodeData | null;
    selectedNodeId: string | null;
  } = $props();

  const dispatch = createEventDispatcher<{ nodeClick: { id: string } }>();

  let svgEl = $state<SVGSVGElement | undefined>();
  let gEl = $state<SVGGElement | undefined>();
  let width = $state(0);
  let height = $state(0);

  const nodeWidth = 140;
  const nodeHeight = 40;
  const transitionDuration = 300;

  onMount(() => {
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const g = svg.append('g').attr('class', 'content-group');
    gEl = g.node()!;

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));

    svg.call(zoomBehavior).on('dblclick.zoom', null);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries?.[0]) return;
      width = entries[0].contentRect.width;
      height = entries[0].contentRect.height;
      // Centrar la vista inicial y en cada resize
      const initialTransform = d3.zoomIdentity.translate(80, height / 2);
      svg
        .transition()
        .duration(200)
        .call(zoomBehavior.transform, initialTransform);
    });
    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });

  // Un único $effect para re-renderizar todo cuando los datos cambian
  $effect(() => {
    if (!treeData || !gEl) {
      if (gEl) d3.select(gEl).selectAll('*').remove();
      return;
    }

    // 1. Preparar la jerarquía
    const root = d3.hierarchy(treeData);
    (root as any).x0 = height / 2;
    (root as any).y0 = 0;

    root.descendants().forEach((d: any, i) => {
      d.id = d.data.id || `node-${i}`;
      // Colapsar todo por defecto, excepto el primer nivel
      if (d.depth > 0) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        }
      }
    });

    // 2. Definir la función de renderizado
    function update(source: any) {
      if (!gEl) return;
      const g = d3.select(gEl);

      const dx = nodeHeight + 20;
      const dy = nodeWidth + 50;
      const treeLayout = d3.tree<TreeNodeData>().nodeSize([dx, dy]);

      const layoutRoot = treeLayout(root);
      const nodes = layoutRoot.descendants().reverse();
      const links = layoutRoot.links();

      const transition = d3.transition().duration(transitionDuration);

      // NODOS
      const node = g
        .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNodeData>>('g.node')
        .data(nodes, (d: any) => d.id);

      const nodeEnter = node
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', `translate(${source.y0},${source.x0})`)
        .attr('opacity', 0)
        .on('click', (event, d: any) => {
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        })
        .on('dblclick', (event, d: any) => {
          event.stopPropagation();
          dispatch('nodeClick', { id: d.id });
        });

      nodeEnter
        .append('rect')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('x', 0)
        .attr('y', -nodeHeight / 2)
        .attr('rx', 4);

      const fo = nodeEnter
        .append('foreignObject')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('x', 0)
        .attr('y', -nodeHeight / 2);
      fo.append('xhtml:div')
        .attr('class', 'node-label')
        .html((d: any) => d.data.content);

      nodeEnter.append('circle').attr('class', 'indicator').attr('r', 4);

      const nodeUpdate = node.merge(nodeEnter);

      nodeUpdate.classed('is-selected', (d: any) => d.id === selectedNodeId);
      nodeUpdate
        .select<SVGCircleElement>('.indicator')
        .attr('opacity', (d: any) => (d.children || d._children ? 1 : 0))
        .classed('is-collapsed', (d: any) => !!d._children)
        .attr(
          'transform',
          `translate(${nodeWidth - 10}, ${-nodeHeight / 2 + 10})`
        );

      nodeUpdate
        .transition(transition)
        .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
        .attr('opacity', 1);

      node
        .exit()
        .transition(transition)
        .remove()
        .attr('transform', (d: any) => `translate(${source.y},${source.x})`)
        .attr('opacity', 0);

      // ENLACES
      const link = g
        .selectAll<
          SVGPathElement,
          d3.HierarchyPointLink<TreeNodeData>
        >('path.link')
        .data(links, (d: any) => d.target.id);
      const linkGenerator = d3
        .linkHorizontal<any, any>()
        .x((d) => d.y)
        .y((d) => d.x);

      link
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('d', () => {
          const o = {
            source: { y: source.y0, x: source.x0 },
            target: { y: source.y0, x: source.x0 },
          };
          return linkGenerator(o);
        })
        .merge(link)
        .transition(transition)
        .attr('d', linkGenerator);

      link
        .exit()
        .transition(transition)
        .remove()
        .attr('d', () => {
          const o = {
            source: { y: source.y, x: source.x },
            target: { y: source.y, x: source.x },
          };
          return linkGenerator(o);
        });

      layoutRoot.each((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // 3. Llamada inicial
    update(root);
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

  /* === Estilos Base === */
  :global(.tree-svg .link) {
    fill: none;
    stroke: var(--color-gray-100);
    stroke-width: 1px;
    transition:
      stroke 300ms,
      stroke-width 300ms,
      opacity 300ms;
  }
  :global(.tree-svg .node) {
    cursor: pointer;
    font-family: var(--font-main);
    transition: opacity 300ms;
    -webkit-tap-highlight-color: transparent;
  }
  :global(.tree-svg .node rect) {
    fill: var(--color-background);
    stroke: var(--color-gray-100);
    stroke-width: 1px;
    transition:
      fill 0.2s,
      stroke 0.2s,
      stroke-width 0.2s;
  }
  :global(.tree-svg .node .node-label) {
    width: 100%;
    height: 100%;
    padding: 6px 8px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text);
    line-height: 1.3;
    word-break: break-word;
    user-select: none;
    pointer-events: none;
  }

  /* === Indicador de Hijos === */
  :global(.tree-svg .node .indicator) {
    stroke: var(--color-gray-500);
    stroke-width: 1.5px;
    fill: transparent;
    transition:
      fill 300ms,
      stroke 300ms,
      opacity 300ms;
  }
  :global(.tree-svg .node .indicator.is-collapsed) {
    fill: var(--color-gray-500);
  }
  :global(.tree-svg .node:hover .indicator.is-collapsed) {
    fill: var(--color-accent);
    stroke: var(--color-accent);
  }
  :global(.tree-svg .node:hover .indicator) {
    stroke: var(--color-accent);
  }

  /* === Estados de Interacción === */
  :global(.tree-svg .node.has-children rect) {
    fill: var(--color-gray-100);
  }
  :global(.tree-svg .node:hover rect) {
    stroke: var(--color-accent);
    stroke-width: 1.5px;
  }
  :global(.tree-svg .node.is-selected rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
    fill: hsl(var(--color-accent-hsl, 16 84% 53%) / 0.1);
  }
  :global(.tree-svg .node.is-selected .node-label) {
    font-weight: 700;
  }

  /* === Estilos de Resaltado de Linaje (Hover) === */
  :global(.tree-svg .is-dimmed) {
    opacity: 0.15 !important;
  }
  :global(.tree-svg .link.is-ancestor) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }
  :global(.tree-svg .node.is-ancestor rect) {
    stroke: var(--color-accent);
  }
  :global(.tree-svg .link.is-descendant) {
    stroke: var(--color-gray-500);
  }
  :global(.tree-svg .node.is-descendant rect) {
    stroke: var(--color-gray-500);
  }
  :global(.tree-svg .node:hover.is-ancestor rect),
  :global(.tree-svg .node:hover.is-descendant rect),
  :global(.tree-svg .node:hover rect) {
    stroke: var(--color-accent);
    stroke-width: 2px;
  }
</style>
