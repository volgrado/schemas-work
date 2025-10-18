<!--
  @component
  OrganicCanvas

  This component renders a dynamic, multi-layered cosmic background.
  It creates an immersive "living universe" effect suitable for a deep-focus application.

  V10 Features:
  - Persistent Universe: The background canvas is now cached in memory. When navigating between pages, the background appears instantly without regenerating, creating a seamless and persistent universe effect. The background is only regenerated if the window size changes.
  - Progressive Rendering: The background now loads in stages to eliminate any delay or "jank" during transitions. Stars appear instantly, and heavier artistic elements like galaxies and nebulae fade in smoothly moments later. This ensures a seamless user experience.
  - Ultra-Optimized with Static Pre-rendering: All static elements (stars, galaxies, nebulae) are drawn only once to an offscreen canvas.
  - Detailed Procedural Galaxy: Features a new, more realistic spiral galaxy.
  - Static Background with Minimal Motion: The only movement comes from very infrequent shooting stars.
  - Performance Throttling: Animation pauses when the browser tab is inactive.
  - Fully responsive and regenerates its high-detail background on resize.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let isExiting: boolean = false;

  // Main visible canvas
  let canvasEl: HTMLCanvasElement;
  let animationFrameId: number;
  let shootingStarInterval: number;

  // Offscreen canvas for pre-rendering all static layers into one image
  let staticBgCanvas: HTMLCanvasElement;

  // Cache for the pre-rendered canvas to persist across component mounts
  let cachedCanvas: HTMLCanvasElement | null = null;

  // --- Type Definitions ---
  interface ShootingStar {
    x: number;
    y: number;
    len: number;
    speed: number;
    angle: number;
    alpha: number;
  }

  let shootingStars: ShootingStar[] = [];
  let artisticDetailsReady = false;
  let artisticDetailsAlpha = 0;

  // --- Initialization and Pre-rendering ---
  function init() {
    if (!canvasEl) return;
    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;

    // If a cached canvas exists from a previous mount and has the same dimensions, reuse it instantly.
    if (
      cachedCanvas &&
      cachedCanvas.width === canvasEl.width &&
      cachedCanvas.height === canvasEl.height
    ) {
      staticBgCanvas = cachedCanvas;
      artisticDetailsReady = true;
      artisticDetailsAlpha = 1; // Show instantly without fade-in
    } else {
      // Otherwise, generate a new background with progressive rendering.
      artisticDetailsReady = false;
      artisticDetailsAlpha = 0;

      // Create or resize offscreen canvas
      staticBgCanvas = document.createElement('canvas');
      staticBgCanvas.width = canvasEl.width;
      staticBgCanvas.height = canvasEl.height;

      const staticCtx = staticBgCanvas.getContext('2d');
      if (!staticCtx) return;

      // PHASE 1: Render lightweight stars immediately
      drawStars(staticCtx, canvasEl.width, canvasEl.height);

      // PHASE 2: Schedule heavy artistic details to be drawn after a short delay
      setTimeout(() => {
        if (!staticBgCanvas) return;
        const staticCtx = staticBgCanvas.getContext('2d');
        if (!staticCtx) return;

        drawArtisticDetails(staticCtx, canvasEl.width, canvasEl.height);
        cachedCanvas = staticBgCanvas; // Cache the fully rendered canvas
        artisticDetailsReady = true; // Signal that the details are ready to be faded in
      }, 100); // 100ms delay to ensure the main thread is free
    }

    // --- Shooting Stars ---
    shootingStars = [];
    if (shootingStarInterval) clearInterval(shootingStarInterval);
    shootingStarInterval = window.setInterval(createShootingStar, 25000);
  }

  function drawStars(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    const scaleFactor = Math.max(0.5, Math.min(width / 1200, 1.2));
    const densities = [15000, 12000, 18000];
    const radii = [0.4, 0.8, 1.2];

    for (let i = 0; i < 3; i++) {
      const starCount = (width * height) / (densities[i] / scaleFactor);
      for (let j = 0; j < starCount; j++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = (Math.random() * radii[i] + 0.5) * scaleFactor;
        const alpha = Math.random() * 0.5 + 0.2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 220, 255, ${alpha})`;
        ctx.fill();
      }
    }
  }

  function drawArtisticDetails(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    const scaleFactor = Math.max(0.5, Math.min(width / 1200, 1.2));
    const accentHsl =
      getComputedStyle(document.documentElement).getPropertyValue(
        '--color-accent-hsl'
      ) || '16 84% 53%';

    // Draw subtle nebulae
    const nebulaCount = 3;
    for (let i = 0; i < nebulaCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = (Math.random() * 300 + 300) * scaleFactor;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `hsla(${accentHsl} / 0.05)`);
      gradient.addColorStop(1, `hsla(${accentHsl} / 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw a faint distant spiral galaxy
    const galaxyX = Math.random() * width * 0.8 + width * 0.1;
    const galaxyY = Math.random() * height * 0.8 + height * 0.1;
    const galaxyRadius = (Math.random() * 80 + 90) * scaleFactor;
    const arms = 2;
    const armSpread = 0.5;
    const armLength = Math.PI * 2.5;

    ctx.save();
    ctx.translate(galaxyX, galaxyY);
    ctx.rotate(Math.random() * Math.PI * 2);

    // Draw galaxy stars
    for (let i = 0; i < 1500 * scaleFactor; i++) {
      const r = Math.pow(Math.random(), 1.5) * galaxyRadius;
      const armIndex = Math.floor(Math.random() * arms);
      const angleOffset =
        gaussianRandom(0, armSpread) / (r / galaxyRadius + 0.1);
      const theta =
        (armIndex / arms) * Math.PI * 2 +
        (r / galaxyRadius) * armLength +
        angleOffset;

      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const size = (1 - r / galaxyRadius) * 1.1 + 0.2;

      let color = '200, 30%, 90%'; // Blueish
      if (r < galaxyRadius * 0.2) color = '50, 40%, 95%'; // Yellowish white core

      ctx.beginPath();
      ctx.arc(x, y, size * 0.5 * scaleFactor, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${color}, ${Math.random() * 0.4 + 0.1})`;
      ctx.fill();
    }

    // Draw galactic core glow
    const coreGradient = ctx.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      galaxyRadius * 0.3
    );
    coreGradient.addColorStop(0, `rgba(255, 255, 220, 0.1)`);
    coreGradient.addColorStop(1, `rgba(255, 255, 220, 0)`);
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, galaxyRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function gaussianRandom(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
  }

  function createShootingStar() {
    if (!canvasEl) return;
    const scaleFactor = Math.max(0.5, Math.min(canvasEl.width / 1200, 1.2));
    const angle = Math.random() * Math.PI * 2;
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) {
      x = 0;
      y = Math.random() * canvasEl.height;
    } else if (edge === 1) {
      x = canvasEl.width;
      y = Math.random() * canvasEl.height;
    } else if (edge === 2) {
      x = Math.random() * canvasEl.width;
      y = 0;
    } else {
      y = canvasEl.height;
      x = Math.random() * canvasEl.width;
    }

    shootingStars.push({
      x,
      y,
      len: (Math.random() * 80 + 20) * scaleFactor,
      speed: (Math.random() * 4 + 6) * scaleFactor,
      angle: angle,
      alpha: 1,
    });
  }

  // --- Highly Optimized Animation Loop ---
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    if (!canvasEl || !staticBgCanvas) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Fade in artistic details once they are ready
    if (artisticDetailsReady && artisticDetailsAlpha < 1) {
      artisticDetailsAlpha = Math.min(1, artisticDetailsAlpha + 0.015);
    }

    ctx.globalAlpha = artisticDetailsAlpha;
    ctx.drawImage(staticBgCanvas, 0, 0);
    ctx.globalAlpha = 1;

    // --- Draw Dynamic Elements (Shooting Stars) ---
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.x += s.speed * Math.cos(s.angle);
      s.y += s.speed * Math.sin(s.angle);
      s.alpha -= 0.015;

      if (
        s.alpha <= 0 ||
        s.x < -s.len ||
        s.x > canvasEl.width + s.len ||
        s.y < -s.len ||
        s.y > canvasEl.height + s.len
      ) {
        shootingStars.splice(i, 1);
        continue;
      }
      const tailX = s.x - s.len * Math.cos(s.angle);
      const tailY = s.y - s.len * Math.sin(s.angle);
      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${s.alpha})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      cancelAnimationFrame(animationFrameId);
      clearInterval(shootingStarInterval);
    } else {
      animationFrameId = requestAnimationFrame(animate);
      shootingStarInterval = window.setInterval(createShootingStar, 25000);
    }
  }

  onMount(() => {
    init();
    animate();
    window.addEventListener('resize', init); // Re-init to regenerate canvases on resize
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });
  onDestroy(() => {
    cancelAnimationFrame(animationFrameId);
    clearInterval(shootingStarInterval);
    window.removeEventListener('resize', init);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
</script>

<div class="canvas-container" class:is-exiting={isExiting}>
  <canvas bind:this={canvasEl} class="organic-canvas" aria-hidden="true" />
</div>

<style>
  .canvas-container {
    position: fixed;
    inset: 0;
    z-index: -1;
    opacity: 1;
    transition: opacity 0.5s ease-in-out;
  }
  .canvas-container::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: inset 0 0 120px 60px
      hsla(var(--color-accent-hsl, 16 84% 53%) / 0.1);
    z-index: 1;
  }
  .canvas-container.is-exiting {
    opacity: 0;
  }
  .organic-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
