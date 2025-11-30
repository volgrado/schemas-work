<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { select, zoom, zoomIdentity } from 'd3';
  import NodeMarker from './NodeMarker.svelte';
  import { generateConstellation, generateBranchNodes, type NodeData } from '../utils/layoutGenerator';
  import { curriculumStore } from '../core/curriculumStore.svelte';
  import { AiCurriculumGenerator } from '../curriculum/aiCurriculumGenerator';
  import type { ActionOrientedTask } from '../domain/models';

  interface Props {
    onSelectNode: (id: string) => void;
    onDebriefNode: (id: string) => void;
    onMentorNode?: (id: string) => void;
  }

  let { onSelectNode, onDebriefNode, onMentorNode }: Props = $props();

  let shakingNodeId = $state<string | null>(null);
  let expandedNodes = $state<Set<string>>(new Set());
  let hoveredNodeId = $state<string | null>(null);
  let isExpanding = $state(false);

  // Generate the constellation based on the active curriculum
  let curriculumNodes = $derived.by(() => {
    const active = curriculumStore.activeCurriculum;
    
    if (active && active.scenario && active.scenario.tasks && active.scenario.tasks.length > 0) {
      // Map Scenario Tasks to Nodes
      const root: NodeData = {
          id: 'root',
          title: active.scenario.title || active.title,
          type: 'core',
          status: 'mastered',
          x: 50,
          y: 50,
          parents: []
      };
      
      const mappedNodes: NodeData[] = [root];
      const tasks = active.scenario.tasks as (ActionOrientedTask & { parentId?: string })[];

      tasks.forEach((task, index) => {
          // Calculate position based on parent
          const parentId = task.parentId || 'root';
          const parentNode = mappedNodes.find(n => n.id === parentId) || root;
          
          // Simple layout: Radial fan out from parent
          // We need a deterministic way to place them based on index or hash
          // For now, let's use a simple random-ish distribution based on ID hash or index
          // But 'index' is global.
          
          // Find siblings to determine angle
          const siblings = tasks.filter(t => (t.parentId || 'root') === parentId);
          const siblingIndex = siblings.findIndex(t => t.id === task.id);
          
          // If parent is root, use full circle. If parent is a node, use a sector.
          let angle;
          let distance;
          
          if (parentId === 'root') {
             angle = (siblingIndex / siblings.length) * Math.PI * 2;
             distance = 20 + (siblingIndex % 2) * 5;
          } else {
             // Branching out: Use parent's angle + offset
             // We need parent's angle relative to its parent (grandparent)
             // This requires recursive calculation or storing angle.
             // Simplified: Just radiate out from parent's position relative to center (50,50)
             const dx = parentNode.x - 50;
             const dy = parentNode.y - 50;
             const parentAngle = Math.atan2(dy, dx);
             
             // Fan out +/- 45 degrees
             const spread = Math.PI / 2; // 90 degrees
             const startAngle = parentAngle - spread / 2;
             const step = spread / (siblings.length + 1);
             angle = startAngle + step * (siblingIndex + 1);
             distance = 15;
          }

          const isMastered = active.progress?.mastered?.includes(task.id);
          const isUnlocked = active.progress?.unlocked?.includes(task.id) || parentId === 'root' || isMastered; // Simplified unlock logic

          mappedNodes.push({
              id: task.id,
              title: task.description.substring(0, 20) + '...',
              type: 'pragmatic',
              status: isMastered ? 'mastered' : (isUnlocked ? 'active' : 'locked'),
              x: parentNode.x + Math.cos(angle) * distance,
              y: parentNode.y + Math.sin(angle) * distance,
              parents: [parentId]
          });
      });
      return mappedNodes;
    } else {
      return generateConstellation('sovereign-learner-seed');
    }
  });

  function triggerActivation(node: NodeData) {
    // 1. Activate the clicked node
    node.activated = true;

    // 2. Find neighbors (parents and children)
    const neighbors = curriculumNodes.filter(n => 
      node.parents.includes(n.id) || // Parents
      n.parents.includes(node.id)    // Children
    );

    // 3. Activate neighbors with a delay (Spreading effect)
    neighbors.forEach((neighbor, i) => {
      setTimeout(() => {
        neighbor.activated = true;
      }, 150 + (i * 100)); // Staggered activation
    });

    // 4. Deactivate after a few seconds
    setTimeout(() => {
      node.activated = false;
      neighbors.forEach(n => n.activated = false);
    }, 3000);
  }

  function handleNodeClick(node: NodeData) {
    if (node.status === 'locked') {
      // Trigger shake
      shakingNodeId = node.id;
      setTimeout(() => {
        shakingNodeId = null;
      }, 2000); 
    } else {
      // Refresh Trace (Reset Decay)
      if (node.decay && node.decay > 0) {
        node.decay = 0; // "Neurons that fire together, wire together" - refreshing the trace
      }

      if (node.status === 'mastered') {
        // Show debrief or expand options
        onDebriefNode(node.id);
      } else {
        onSelectNode(node.id);
      }
    }
  }

  async function handleExpand(e: MouseEvent, node: NodeData) {
    e.stopPropagation();
    if (expandedNodes.has(node.id) || isExpanding) return;

    isExpanding = true;
    
    try {
        // Find the task object
        const active = curriculumStore.activeCurriculum;
        const task = active?.scenario?.tasks?.find((t: any) => t.id === node.id);
        
        if (task) {
            const generator = new AiCurriculumGenerator();
            const newTasks = await generator.expandCurriculumNode(task);
            
            // Add parentId to new tasks
            const tasksWithParent = newTasks.map(t => ({ ...t, parentId: node.id }));
            
            curriculumStore.expandNode(tasksWithParent);
            expandedNodes.add(node.id);
        } else {
            // Fallback for root or non-task nodes (e.g. seed nodes if mixed)
            // But we are in AI mode now.
            console.warn("Cannot expand: Task not found for node", node.id);
        }
    } catch (err) {
        console.error("Failed to expand node:", err);
    } finally {
        isExpanding = false;
    }
  }

  function handleMentor(e: MouseEvent, node: NodeData) {
    e.stopPropagation();
    if (onMentorNode) onMentorNode(node.id);
  }

  let mapContainer: HTMLDivElement;
  let universeContent: HTMLDivElement;

  onMount(() => {
    if (mapContainer && universeContent) {
      const svg = select(mapContainer);
      const content = select(universeContent);

      const zoomBehavior = zoom<HTMLDivElement, unknown>()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
          content.style('transform', `translate(${event.transform.x}px, ${event.transform.y}px) scale(${event.transform.k})`);
        });

      svg.call(zoomBehavior);

      // Initial Center Calculation
      // Universe is 200vw x 200vh. Center is at 100vw, 100vh.
      // We want that point to be in the center of the container.
      const containerWidth = mapContainer.clientWidth;
      const containerHeight = mapContainer.clientHeight;
      const contentWidth = universeContent.clientWidth;
      const contentHeight = universeContent.clientHeight;

      const initialScale = 0.8;
      const tx = (containerWidth - contentWidth * initialScale) / 2;
      const ty = (containerHeight - contentHeight * initialScale) / 2;

      svg.call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(initialScale));
    }
  });

  function getNodeById(id: string) {
    return curriculumNodes.find(n => n.id === id);
  }

  // Generate a curved path between two points
  function getCurvedPath(x1: number, y1: number, x2: number, y2: number) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const cx1 = x1 + (x2 - x1) * 0.5;
    const cy1 = y1;
    const cx2 = x2 - (x2 - x1) * 0.5;
    const cy2 = y2;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

</script>

<div class="constellation-map" bind:this={mapContainer} in:fade>
  <div class="universe-content" bind:this={universeContent}>
    <!-- Connections Layer -->
    <svg class="connections-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
      {#each curriculumNodes as node}
        {#each node.parents as parentId}
          {@const parent = getNodeById(parentId)}
          {#if parent}
            {@const pathD = getCurvedPath(parent.x, parent.y, node.x, node.y)}
            <!-- Base Line -->
            <path
              d={pathD}
              class="connection-line"
              class:active={node.status !== 'locked'}
              class:activated={node.activated || parent.activated}
              style="opacity: {node.status !== 'locked' ? 0.5 * (1 - (node.decay || 0)) : 0.3}" 
            />
            
            <!-- Pulse Removed for Performance -->
          {/if}
        {/each}
      {/each}
    </svg>

    <!-- Nodes Layer -->
    {#each curriculumNodes as node, i (node.id)}
      <div
        class="node-wrapper"
        style="
          left: {node.x}%; 
          top: {node.y}%; 
          transition-delay: {i * 50}ms;
          animation-delay: {i * 0.5}s;
          z-index: {hoveredNodeId === node.id ? 50 : 10};
          filter: grayscale({(node.decay || 0) * 100}%);
          opacity: {1 - ((node.decay || 0) * 0.5)};
        "
        in:scale={{ duration: 500, delay: 100 }}
        onmouseenter={() => {
          hoveredNodeId = node.id;
          if (node.status !== 'locked') triggerActivation(node);
        }}
        onmouseleave={() => hoveredNodeId = null}
        role="group"
      >
        <div class="interaction-layer" class:shaking={shakingNodeId === node.id}>
          <div class="node-glow" class:activated={node.activated}></div>
          <NodeMarker
            title={node.title}
            status={node.status}
            type={node.type}
            onclick={() => handleNodeClick(node)}
          />
          
          <!-- Sovereign Expansion Action -->
          {#if node.status === 'mastered' && hoveredNodeId === node.id}
            <div class="node-actions" in:fly={{ y: 10, duration: 200 }} out:fade={{ duration: 150 }}>
              {#if !expandedNodes.has(node.id)}
                <button 
                  class="action-btn expand-btn" 
                  onclick={(e) => handleExpand(e, node)}
                  title="Expand Branch"
                >
                  ✨
                </button>
              {/if}
              
              <button 
                class="action-btn mentor-btn" 
                onclick={(e) => handleMentor(e, node)}
                title="Teach (The Protégé)"
              >
                🎓
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/each}


    <!-- Locked Feedback Overlay (Toast) -->
    {#if shakingNodeId}
      {@const node = getNodeById(shakingNodeId)}
      {#if node}
        <div class="locked-toast" in:fly={{ y: -20, duration: 300 }} out:fade>
          <div class="icon-box">🔒</div>
          <div class="content">
            <span class="title">Access Denied</span>
            <span class="reason">
              Prerequisites Missing: 
              {#each node.parents as parentId, i}
                {@const parent = getNodeById(parentId)}
                <span class="prereq">{parent?.title}{i < node.parents.length - 1 ? ', ' : ''}</span>
              {/each}
            </span>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .constellation-map {
    width: 100%;
    height: 100%;
    overflow: hidden; /* D3 handles movement */
    cursor: grab;
    background: radial-gradient(circle at 50% 50%, rgba(var(--color-accent-rgb), 0.05) 0%, transparent 60%);
    touch-action: none; /* Important for touch gestures */
  }
  .constellation-map:active {
    cursor: grabbing;
  }

  .universe-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 200vw; 
    height: 200vh;
    transform-origin: 0 0; /* Important for D3 Zoom */
    will-change: transform;
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
    stroke: var(--color-border);
    stroke-width: 0.5px; /* Thinner, more elegant lines */
    stroke-dasharray: 2 4;
    opacity: 0.3;
    transition: stroke 0.5s, opacity 0.5s, stroke-width 0.3s;
    vector-effect: non-scaling-stroke; /* Keep stroke width constant on scale */
  }

  .connection-line.active {
    stroke: var(--color-accent);
    opacity: 0.5;
    stroke-dasharray: 1 0; /* Solid */
  }

  .connection-line.activated {
    stroke: var(--color-info);
    stroke-width: 2px;
    opacity: 1;
    filter: drop-shadow(0 0 5px var(--color-info));
  }

  /* .connection-pulse removed */
  /* @keyframes pulse-flow removed */

  .node-wrapper {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 10;
    /* animation: float 6s ease-in-out infinite; REMOVED for performance */
  }

  /* @keyframes float removed */

  .interaction-layer {
    position: relative;
  }

  .node-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    pointer-events: none;
    transition: all 0.3s ease;
    z-index: -1;
  }

  .node-glow.activated {
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(var(--color-info-rgb), 0.4) 0%, transparent 70%);
    animation: pulse-glow 1s ease-in-out infinite alternate;
  }

  @keyframes pulse-glow {
    from { opacity: 0.6; transform: translate(-50%, -50%) scale(0.9); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
  }

  .shaking {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  }

  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }

  .locked-toast {
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(239, 68, 68, 0.3); /* Red tint */
    padding: 1rem 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 1000;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    pointer-events: none;
    min-width: 300px;
  }

  .icon-box {
    width: 40px;
    height: 40px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
    color: #ef4444;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #ef4444;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reason {
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .prereq {
    font-weight: 600;
    color: var(--color-text);
  }

  .node-actions {
    position: absolute;
    top: -45px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
    z-index: 100;
  }

  .action-btn {
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-accent);
    color: var(--color-accent);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    font-size: 1.2rem;
    transition: all 0.2s ease;
    pointer-events: auto;
  }

  .action-btn:hover {
    background: var(--color-accent);
    color: #000;
    transform: scale(1.1);
    box-shadow: 0 0 15px var(--color-accent);
  }

  .mentor-btn {
    border-color: var(--color-info);
    color: var(--color-info);
  }

  .mentor-btn:hover {
    background: var(--color-info);
    box-shadow: 0 0 15px var(--color-info);
  }
</style>
