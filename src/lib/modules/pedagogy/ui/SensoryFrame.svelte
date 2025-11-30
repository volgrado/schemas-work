<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  interface Props {
    imageSrc: string;
    contextText: string;
  }

  let { imageSrc, contextText }: Props = $props();

  // The Lens (Interactive Scanning)
  interface Hotspot {
    id: string;
    x: number; // %
    y: number; // %
    label: string;
    discovered: boolean;
  }

  let hotspots = $state<Hotspot[]>([
    { id: '1', x: 30, y: 40, label: 'Guard Uniform', discovered: false },
    { id: '2', x: 60, y: 60, label: 'Identification Scanner', discovered: false },
    { id: '3', x: 80, y: 20, label: 'Security Camera', discovered: false }
  ]);

  let activeHotspot = $state<Hotspot | null>(null);
  let mouseX = $state(0);
  let mouseY = $state(0);

  function handleMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function handleHotspotEnter(hotspot: Hotspot) {
    activeHotspot = hotspot;
    if (!hotspot.discovered) {
      // Simulate scanning delay
      setTimeout(() => {
        hotspot.discovered = true;
      }, 800);
    }
  }

  function handleHotspotLeave() {
    activeHotspot = null;
  }
</script>

<div 
  class="sensory-frame" 
  onmousemove={handleMouseMove}
  role="region" 
  aria-label="Sensory Context"
>
  <!-- Visual Stimulus -->
  <div class="visual-layer">
    <img src={imageSrc} alt="Scenario Context" class="context-image" />
    <div class="vignette"></div>
    <div class="scanlines"></div>
    <div class="noise"></div>
    
    <!-- Scanner Reticle (Follows Mouse) -->
    <div 
      class="scanner-reticle" 
      style="transform: translate({mouseX}px, {mouseY}px)"
      class:active={!!activeHotspot}
    >
      <div class="reticle-ring"></div>
      <div class="reticle-crosshair"></div>
      {#if activeHotspot}
        <div class="scan-label" in:fade={{ duration: 200 }}>
          {#if activeHotspot.discovered}
            <span class="label-text">{activeHotspot.label}</span>
          {:else}
            <span class="scanning-text">SCANNING...</span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Hotspots -->
    {#each hotspots as hotspot}
      <div 
        class="hotspot-zone"
        style="left: {hotspot.x}%; top: {hotspot.y}%;"
        onmouseenter={() => handleHotspotEnter(hotspot)}
        onmouseleave={handleHotspotLeave}
        role="button"
        tabindex="0"
        aria-label="Scan object"
      >
        {#if hotspot.discovered}
          <div class="discovered-marker" in:scale></div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .sensory-frame {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: #000;
    cursor: none; /* Hide default cursor for immersion */
  }

  .visual-layer {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .context-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.7;
    transition: transform 20s ease-out;
    filter: saturate(0.8) contrast(1.1);
  }
  
  /* Slow zoom effect */
  .sensory-frame:hover .context-image {
    transform: scale(1.1);
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, transparent 30%, rgba(0,0,0,0.8) 90%, #000 100%);
    pointer-events: none;
  }

  .scanlines {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(255,255,255,0),
      rgba(255,255,255,0) 50%,
      rgba(0,0,0,0.2) 50%,
      rgba(0,0,0,0.2)
    );
    background-size: 100% 4px;
    pointer-events: none;
    opacity: 0.3;
  }

  .noise {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
    pointer-events: none;
    opacity: 0.4;
    mix-blend-mode: overlay;
  }

  /* Scanner Reticle */
  .scanner-reticle {
    position: absolute;
    top: -20px; /* Center offset */
    left: -20px;
    width: 40px;
    height: 40px;
    pointer-events: none;
    z-index: 50;
    transition: width 0.2s, height 0.2s, top 0.2s, left 0.2s;
  }

  .reticle-ring {
    width: 100%;
    height: 100%;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
  }

  .scanner-reticle.active .reticle-ring {
    border-color: var(--color-accent);
    box-shadow: 0 0 15px var(--color-accent);
    transform: scale(1.5);
    border-width: 2px;
    border-style: dashed;
    animation: spin 4s linear infinite;
  }

  .reticle-crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 4px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .scan-label {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 1rem;
    white-space: nowrap;
    background: rgba(0, 0, 0, 0.8);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--color-accent);
  }

  .label-text {
    color: #fff;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .scanning-text {
    color: var(--color-accent);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    animation: blink 0.5s infinite;
  }

  /* Hotspots */
  .hotspot-zone {
    position: absolute;
    width: 60px;
    height: 60px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    cursor: none; /* Keep custom cursor */
    z-index: 40;
    /* Debug: background: rgba(255, 0, 0, 0.2); */
  }

  .discovered-marker {
    width: 100%;
    height: 100%;
    border: 1px solid var(--color-success);
    border-radius: 50%;
    opacity: 0.5;
    box-shadow: 0 0 10px var(--color-success);
  }

  @keyframes spin {
    from { transform: rotate(0deg) scale(1.5); }
    to { transform: rotate(360deg) scale(1.5); }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>


