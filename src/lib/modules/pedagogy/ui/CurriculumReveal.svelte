<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale, draw } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { generateConstellation, type NodeData } from '../utils/layoutGenerator';
  import NodeMarker from './NodeMarker.svelte';
  import type { ManifestoData } from './ManifestoForm.svelte';

  interface Props {
    data: ManifestoData | null;
    onComplete: () => void;
  }

  let { data, onComplete }: Props = $props();

  const nodes = generateConstellation('sovereign-learner-seed');
  
  // Animation State
  let visibleNodeIds = $state<Set<string>>(new Set());
  let visibleConnectionIds = $state<Set<string>>(new Set());
  let showTitle = $state(false);

  function getNodeById(id: string) {
    return nodes.find(n => n.id === id);
  }

  function getCurvedPath(x1: number, y1: number, x2: number, y2: number) {
    const cx1 = x1 + (x2 - x1) * 0.5;
    const cy1 = y1;
    const cx2 = x2 - (x2 - x1) * 0.5;
    const cy2 = y2;
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

  // BFS to calculate animation sequence
  function startAnimation() {
    const root = nodes.find(n => n.parents.length === 0);
    if (!root) return;

    const queue: { id: string; delay: number }[] = [{ id: root.id, delay: 0 }];
    const visited = new Set<string>([root.id]);

    // Process the queue
    const processQueue = () => {
      if (queue.length === 0) {
        // Animation complete
        setTimeout(() => {
          showTitle = true;
          setTimeout(onComplete, 4000); // Give user time to read
        }, 1000);
        return;
      }

      // Sort queue by delay to process in order
      queue.sort((a, b) => a.delay - b.delay);
      const current = queue.shift();
      if (!current) return;

      const node = getNodeById(current.id);
      if (!node) return;

      // Reveal Node
      setTimeout(() => {
        visibleNodeIds = new Set(visibleNodeIds).add(current.id);
      }, current.delay);

      // Find children (nodes that have this node as a parent)
      const children = nodes.filter(n => n.parents.includes(current.id));

      children.forEach(child => {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          
          // Connection delay: starts shortly after parent appears
          const connectionDelay = current.delay + 400;
          const connectionId = `${current.id}-${child.id}`;
          
          setTimeout(() => {
            visibleConnectionIds = new Set(visibleConnectionIds).add(connectionId);
          }, connectionDelay);

          // Child delay: starts after connection finishes drawing (approx 600ms duration)
          const childDelay = connectionDelay + 500;
          
          queue.push({ id: child.id, delay: childDelay });
        }
      });

      // Continue processing
      if (queue.length > 0) {
        processQueue();
      } else {
        // Final check if loop finished
        setTimeout(() => {
            showTitle = true;
            setTimeout(onComplete, 4000);
        }, current.delay + 1000);
      }
    };

    processQueue();
  }

  onMount(() => {
    startAnimation();
  });
</script>

<div class="curriculum-reveal" in:fade>
  <div class="universe-content" class:blurred={showTitle}>
    <!-- Connections Layer -->
    <svg class="connections-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      {#each nodes as node}
        {#each node.parents as parentId}
          {@const parent = getNodeById(parentId)}
          {@const connectionId = `${parentId}-${node.id}`}
          {#if parent && visibleConnectionIds.has(connectionId)}
            {@const pathD = getCurvedPath(parent.x, parent.y, node.x, node.y)}
            <!-- Drawing Line -->
            <path
              d={pathD}
              class="connection-line"
              in:draw={{ duration: 800, easing: cubicOut }}
            />
          {/if}
        {/each}
      {/each}
    </svg>

    <!-- Nodes Layer -->
    {#each nodes as node}
      {#if visibleNodeIds.has(node.id)}
        <div 
          class="node-reveal"
          style="
            top: {node.y}%; 
            left: {node.x}%;
          "
        >
          <!-- Use the exact same component as SpiralMap for perfect matching -->
          <NodeMarker
            title={node.title}
            status={node.status}
            type={node.type}
          />
        </div>
      {/if}
    {/each}
  </div>

  {#if showTitle}
    <div class="reveal-overlay" in:fade={{ duration: 1000 }}>
      <div class="content-stack">
        <h1 in:fly={{ y: 20 }}>Schema Generated</h1>
        
        <div class="schema-context" in:fly={{ y: 20, delay: 200 }}>
          <div class="context-item">
            <span class="label">Sovereign Intent</span>
            <span class="value">{data?.intent || 'Unknown Protocol'}</span>
          </div>
          <div class="context-item">
            <span class="label">Target Ecosystem</span>
            <span class="value">{data?.ecosystem || 'Global'}</span>
          </div>
        </div>

        <p class="subtext" in:fly={{ y: 20, delay: 400 }}>
          The constellation has been aligned to your vessel.
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .curriculum-reveal {
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, rgba(var(--color-accent-rgb), 0.05) 0%, transparent 60%);
    position: relative;
    overflow: hidden;
  }

  .universe-content {
    position: relative;
    width: 200vw;
    height: 200vh;
    transform: translate(-25%, -25%);
    transition: filter 1s ease;
  }

  .universe-content.blurred {
    filter: blur(8px) brightness(0.6);
  }

  .node-reveal {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 10;
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translate(-50%, -50%) translateY(0); }
    50% { transform: translate(-50%, -50%) translateY(-10px); }
  }

  .connections-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }

  .connection-line {
    fill: none;
    stroke: var(--color-accent);
    stroke-width: 1px;
    opacity: 0.6;
    filter: drop-shadow(0 0 4px var(--color-accent));
    vector-effect: non-scaling-stroke;
  }

  .reveal-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 20;
    pointer-events: none;
  }

  .content-stack {
    text-align: center;
    max-width: 600px;
    padding: 2rem;
  }

  h1 {
    font-size: 3.5rem;
    font-weight: 800;
    color: var(--color-text);
    margin: 0 0 2rem 0;
    text-shadow: 0 0 30px var(--color-accent);
    letter-spacing: -0.02em;
  }

  .schema-context {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
    background: rgba(0, 0, 0, 0.3);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .context-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
  }

  .context-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .label {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-accent);
  }

  .subtext {
    font-size: 1rem;
    color: var(--color-text-secondary);
    font-style: italic;
    opacity: 0.8;
  }
</style>
