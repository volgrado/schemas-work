<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // Assumes your store is in 'src/lib/stores'
  import { themeStore } from '$lib/stores/themeStore.svelte';
  import type { Theme } from '$lib/stores/themeStore.svelte';
  // Assumes your canvas drawing functions are in 'src/lib/utils'
  import { drawStars, drawArtisticDetails } from '$lib/utils/canvas-themes';
  import type { CanvasTheme } from '$lib/utils/canvas-themes';
  // Import the reusable utilities
  import { debounce } from '$lib/utils/debounce';
  import { mulberry32 } from '$lib/utils/prng'; // 1. Import the PRNG utility

  let { isExiting = false } = $props<{ isExiting?: boolean }>();

  // --- Component State ---
  let canvasEl: HTMLCanvasElement;
  let animationFrameId: number;
  let shootingStarInterval: number;
  let staticBgCanvas: HTMLCanvasElement;
  let cachedCanvas: HTMLCanvasElement | null = null;
  let cachedTheme: CanvasTheme | null = null;

  // 2. Define a constant seed for the deterministic background generation.
  // Changing this number will generate a completely different (but still stable) universe.
  const STARFIELD_SEED = 2024;

  // --- Resize Optimization State ---
  let lastRenderedWidth = 0;
  let lastRenderedHeight = 0;
  const RESIZE_DEBOUNCE_MS = 250;
  const RESIZE_THRESHOLD_PX = 100;

  // --- Animation State ---
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
  let currentTheme: CanvasTheme = 'dark';

  /**
   * Initializes and draws the static background canvas.
   * This is the expensive operation we want to optimize.
   * @param force - If true, the resize threshold check is ignored.
   */
  function init(force = false) {
    if (!canvasEl) return;

    const widthChanged =
      Math.abs(window.innerWidth - lastRenderedWidth) > RESIZE_THRESHOLD_PX;
    const heightChanged =
      Math.abs(window.innerHeight - lastRenderedHeight) > RESIZE_THRESHOLD_PX;

    if (!force && !widthChanged && !heightChanged) {
      return;
    }

    lastRenderedWidth = window.innerWidth;
    lastRenderedHeight = window.innerHeight;
    canvasEl.width = lastRenderedWidth;
    canvasEl.height = lastRenderedHeight;

    // 3. Create a new PRNG instance from our seed *every time* we init.
    // This "resets" the sequence of random numbers, ensuring the same star
    // pattern is drawn regardless of canvas size.
    const random = mulberry32(STARFIELD_SEED);

    if (
      cachedCanvas &&
      cachedCanvas.width === canvasEl.width &&
      cachedCanvas.height === canvasEl.height &&
      cachedTheme === currentTheme
    ) {
      staticBgCanvas = cachedCanvas;
      artisticDetailsReady = true;
      artisticDetailsAlpha = 1;
    } else {
      artisticDetailsReady = false;
      artisticDetailsAlpha = 0;
      staticBgCanvas = document.createElement('canvas');
      staticBgCanvas.width = canvasEl.width;
      staticBgCanvas.height = canvasEl.height;
      const staticCtx = staticBgCanvas.getContext('2d');
      if (!staticCtx) return;
      
      // ENHANCEMENT: Use CSS variables for theme colors
      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = currentTheme === 'dark' 
        ? computedStyle.getPropertyValue('--color-background').trim() || '#000000'
        : computedStyle.getPropertyValue('--color-background').trim() || '#f0f4f8';
        
      staticCtx.fillStyle = bgColor;
      staticCtx.fillRect(0, 0, staticBgCanvas.width, staticBgCanvas.height);

      // 4. Pass the seeded 'random' function to the drawing utilities.
      drawStars(
        staticCtx,
        canvasEl.width,
        canvasEl.height,
        currentTheme,
        random
      );

      setTimeout(() => {
        if (!staticBgCanvas || !canvasEl) return; // FIX: Check canvasEl existence
        const staticCtx = staticBgCanvas.getContext('2d');
        if (!staticCtx) return;
        // Also pass it to the artistic details function.
        drawArtisticDetails(
          staticCtx,
          canvasEl.width,
          canvasEl.height,
          currentTheme,
          random
        );
        cachedCanvas = staticBgCanvas;
        cachedTheme = currentTheme;
        artisticDetailsReady = true;
      }, 100);
    }
    shootingStars = [];
    if (shootingStarInterval) clearInterval(shootingStarInterval);
    shootingStarInterval = window.setInterval(createShootingStar, 25000);
  }

  // This function remains unchanged. We want shooting stars to be truly random,
  // not deterministic like the background.
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
      angle,
      len: (Math.random() * 80 + 20) * scaleFactor,
      speed: (Math.random() * 4 + 6) * scaleFactor,
      alpha: 1,
    });
  }

  // ... (animate, handleVisibilityChange, $effect, onMount, onDestroy are unchanged and correct)
  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    if (artisticDetailsReady && artisticDetailsAlpha < 1) {
      artisticDetailsAlpha = Math.min(1, artisticDetailsAlpha + 0.015);
    }
    if (staticBgCanvas) {
      ctx.drawImage(staticBgCanvas, 0, 0);
    }
    ctx.globalAlpha = artisticDetailsAlpha;
    
    // ENHANCEMENT: Dynamic star color based on theme
    const starColor = currentTheme === 'dark' ? '255, 255, 255' : '100, 100, 130';
    
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
      grad.addColorStop(0, `rgba(${starColor}, ${s.alpha})`);
      grad.addColorStop(1, `rgba(${starColor}, 0)`);
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

  $effect(() => {
    const resolveTheme = (t: Theme): CanvasTheme => {
      if (t === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return t;
    };
    const effectiveTheme = resolveTheme(themeStore.theme);
    if (effectiveTheme !== currentTheme) {
      currentTheme = effectiveTheme;
      // FIX: Wait for the DOM class to be updated by the parent layout before reading styles
      setTimeout(() => init(true), 0);
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (themeStore.theme === 'system') {
        const newEffectiveTheme = resolveTheme('system');
        if (newEffectiveTheme !== currentTheme) {
          currentTheme = newEffectiveTheme;
          init(true);
        }
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  });

  onMount(() => {
    const debouncedFinalResize = debounce(() => init(true), RESIZE_DEBOUNCE_MS);
    init(true);
    animate();
    window.addEventListener('resize', debouncedFinalResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('resize', debouncedFinalResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrameId);
    clearInterval(shootingStarInterval);
  });
</script>

<div class="canvas-container" class:is-exiting={isExiting}>
  <canvas bind:this={canvasEl} class="organic-canvas" aria-hidden="true"></canvas>
</div>

<style>
  .canvas-container {
    position: fixed;
    inset: 0;
    z-index: -1;
    opacity: 1;
    transition: opacity 0.5s ease-in-out;
  }
  .canvas-container.is-exiting {
    opacity: 0;
  }
  .organic-canvas {
    display: block;
    width: 100%;
    height: 100%;
    /* A fallback background color in case the canvas takes time to render */
    background-color: var(--color-background);
  }
</style>
