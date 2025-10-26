<!--
  @component
  OrganicCanvas

  This component renders a dynamic, multi-layered cosmic background.
  It creates an immersive "living universe" effect suitable for a deep-focus application.

  V19 Update (Theme Reactivity):
  - Theme-Aware Rendering: This component now subscribes to the global `themeStore`. When the theme changes, it triggers a full re-render of the canvas, generating a distinct and beautiful background for both light and dark modes.
  - No CSS Filters: The light mode effect is no longer achieved with a CSS `filter`. The component now draws a native light-themed canvas, providing much better visual results.
  - System Theme Support: It correctly listens for OS-level theme changes when the 'system' theme is selected.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { theme as themeStore, type Theme } from '$lib/stores/themeStore';

  /**
   * @prop {boolean} [isExiting=false]
   * A boolean that controls the fade-out transition of the canvas.
   */
  export let isExiting: boolean = false;

  // Main visible canvas
  let canvasEl: HTMLCanvasElement;
  let animationFrameId: number;
  let shootingStarInterval: number;

  // Offscreen canvas for pre-rendering all static layers into one image
  let staticBgCanvas: HTMLCanvasElement;

  // Cache for the pre-rendered canvas to persist across component mounts
  let cachedCanvas: HTMLCanvasElement | null = null;
  let cachedTheme: string | null = null;

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
  let currentTheme: 'light' | 'dark' = 'dark';

  // --- Initialization and Pre-rendering ---
  function init() {
    if (!canvasEl) return;

    // The `currentTheme` is now updated reactively by the onMount subscription.
    // This `init` function will be called whenever the theme changes.

    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;

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

      // Set background color based on theme
      staticCtx.fillStyle = currentTheme === 'dark' ? '#000000' : '#f0f4f8';
      staticCtx.fillRect(0, 0, staticBgCanvas.width, staticBgCanvas.height);

      drawStars(staticCtx, canvasEl.width, canvasEl.height);

      setTimeout(() => {
        if (!staticBgCanvas) return;
        const staticCtx = staticBgCanvas.getContext('2d');
        if (!staticCtx) return;
        drawArtisticDetails(staticCtx, canvasEl.width, canvasEl.height);
        cachedCanvas = staticBgCanvas;
        cachedTheme = currentTheme;
        artisticDetailsReady = true;
      }, 100);
    }

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
    const starColor =
      currentTheme === 'dark' ? '220, 220, 255' : '100, 100, 130'; // Darker stars for light theme

    for (let i = 0; i < 3; i++) {
      const starCount = (width * height) / (densities[i] / scaleFactor);
      for (let j = 0; j < starCount; j++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = (Math.random() * radii[i] + 0.5) * scaleFactor;
        const alpha = Math.random() * 0.5 + 0.2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starColor}, ${alpha})`;
        ctx.fill();
      }
    }

    const brightStarCount = Math.floor((width * height) / 100000);
    for (let k = 0; k < brightStarCount; k++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = (Math.random() * 1.5 + 1.5) * scaleFactor;
      drawBrightStar(ctx, x, y, radius);
    }
  }

  function drawBrightStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) {
    const starColor =
      currentTheme === 'dark' ? '255, 255, 255' : '180, 180, 200'; // Light grey for light theme
    const alpha = Math.random() * 0.7 + 0.5;

    // Core
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${starColor}, ${alpha})`;
    ctx.fill();

    // Glow
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
    glowGradient.addColorStop(0, `rgba(${starColor}, ${alpha * 0.3})`);
    glowGradient.addColorStop(1, `rgba(${starColor}, 0)`);
    ctx.fillStyle = glowGradient;
    ctx.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6);

    // Flare
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    for (let i = 0; i < 2; i++) {
      const flareGradient = ctx.createLinearGradient(
        -radius * 8,
        0,
        radius * 8,
        0
      );
      flareGradient.addColorStop(0, `rgba(${starColor}, 0)`);
      flareGradient.addColorStop(0.5, `rgba(${starColor}, ${alpha * 0.4})`);
      flareGradient.addColorStop(1, `rgba(${starColor}, 0)`);
      ctx.strokeStyle = flareGradient;
      ctx.lineWidth = radius * 0.5;
      ctx.beginPath();
      ctx.moveTo(-radius * 8, 0);
      ctx.lineTo(radius * 8, 0);
      ctx.stroke();
      ctx.rotate(Math.PI / 2);
    }
    ctx.restore();
  }

  // --- Drawing Helpers ---
  function drawNebulaLayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    colorStart: string,
    colorEnd: string,
    complexity: number = 5
  ) {
    ctx.save();
    ctx.globalCompositeOperation =
      currentTheme === 'dark' ? 'screen' : 'screen'; // Use screen for light mode for brighter results
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    for (let i = 0; i < complexity; i++) {
      const angle = (i / complexity) * Math.PI * 2;
      const r = radius * (1 + Math.sin(i * 0.7) * 0.2 + Math.random() * 0.1);
      ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.clip();
    for (let i = 0; i < 3; i++) {
      const gradX = (Math.random() - 0.5) * radius;
      const gradY = (Math.random() - 0.5) * radius;
      const gradRadius = radius * (0.5 + Math.random() * 0.5);
      const gradient = ctx.createRadialGradient(
        gradX,
        gradY,
        0,
        gradX,
        gradY,
        gradRadius
      );
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(1, colorEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  function drawDustLane(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    complexity: number
  ) {
    const colorStart =
      currentTheme === 'dark'
        ? 'rgba(0, 0, 0, 0.2)'
        : 'rgba(255, 255, 255, 0.4)'; // Lighter dust for light theme
    const colorEnd =
      currentTheme === 'dark' ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)';
    ctx.save();
    ctx.globalCompositeOperation =
      currentTheme === 'dark' ? 'multiply' : 'screen';
    drawNebulaLayer(ctx, x, y, radius, colorStart, colorEnd, complexity);
    ctx.restore();
  }

  function drawStarCluster(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    density: number,
    scaleFactor: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    const starColor =
      currentTheme === 'dark' ? `220, 220, 255` : `120, 120, 150`; // Darker stars for light theme
    for (let i = 0; i < density * scaleFactor; i++) {
      const r = Math.pow(Math.random(), 2) * radius;
      const angle = Math.random() * Math.PI * 2;
      const px = r * Math.cos(angle);
      const py = r * Math.sin(angle);
      const size = (1 - r / radius) * 1.5 + 0.5;
      const alpha = Math.random() * 0.6 + 0.3;
      ctx.beginPath();
      ctx.arc(px, py, size * 0.5 * scaleFactor, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${starColor}, ${alpha})`;
      ctx.fill();
    }
    const coreGlow =
      currentTheme === 'dark' ? `255, 255, 255` : `200, 200, 220`; // Light grey glow
    const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.4);
    coreGradient.addColorStop(0, `rgba(${coreGlow}, 0.2)`);
    coreGradient.addColorStop(0.5, `rgba(${coreGlow}, 0.1)`);
    coreGradient.addColorStop(1, `rgba(${coreGlow}, 0)`);
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFilament(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string
  ) {
    ctx.save();
    ctx.globalCompositeOperation =
      currentTheme === 'dark' ? 'screen' : 'screen'; // Use screen for light mode too
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const cp1x = x1 + (Math.random() - 0.5) * (x2 - x1) * 2;
    const cp1y = y1 + (Math.random() - 0.5) * (y2 - y1) * 2;
    const cp2x = x2 - (Math.random() - 0.5) * (x2 - x1) * 2;
    const cp2y = y2 - (Math.random() - 0.5) * (y2 - y1) * 2;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);

    const opacity = currentTheme === 'dark' ? 0.15 : 0.5; // Increased opacity for light mode
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, `rgba(${color}, 0)`);
    gradient.addColorStop(0.5, `rgba(${color}, ${opacity})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.random() * 2 + 1;
    ctx.stroke();
    ctx.restore();
  }

  // --- Main Themed Generation ---
  function drawArtisticDetails(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    const scaleFactor = Math.max(0.5, Math.min(width / 1200, 1.2));
    const themeRoll = Math.random();

    // Adjusted probabilities for 6 themes
    if (themeRoll < 0.167) {
      drawDiffuseNebula(ctx, width, height, scaleFactor);
    } else if (themeRoll < 0.334) {
      drawRingNebula(ctx, width, height, scaleFactor);
    } else if (themeRoll < 0.501) {
      drawStarFormingRegion(ctx, width, height, scaleFactor);
    } else if (themeRoll < 0.668) {
      drawCosmicReef(ctx, width, height, scaleFactor);
    } else if (themeRoll < 0.835) {
      drawVeilNebula(ctx, width, height, scaleFactor);
    } else {
      drawBlackHole(ctx, width, height, scaleFactor);
    }
  }

  // Helper to adjust RGBA strings for light/dark mode
  function themedRGBA(
    r: number,
    g: number,
    b: number,
    darkA: number,
    lightA: number
  ) {
    // Increased alpha values for light mode
    return `rgba(${r}, ${g}, ${b}, ${currentTheme === 'dark' ? darkA : lightA * 1.5})`;
  }

  // --- THEME 1: Diffuse Nebula (Orion-like) ---
  function drawDiffuseNebula(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scaleFactor: number
  ) {
    const palettes = [
      [
        {
          start: themedRGBA(255, 120, 50, 0.05, 0.2),
          end: themedRGBA(255, 0, 0, 0, 0),
        },
        {
          start: themedRGBA(50, 120, 255, 0.04, 0.18),
          end: themedRGBA(0, 0, 255, 0, 0),
        },
      ],
      [
        {
          start: themedRGBA(255, 50, 180, 0.05, 0.2),
          end: themedRGBA(200, 0, 200, 0, 0),
        },
        {
          start: themedRGBA(80, 220, 200, 0.04, 0.18),
          end: themedRGBA(0, 255, 255, 0, 0),
        },
      ],
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];

    for (let i = 0; i < 12; i++) {
      const color = palette[i % palette.length];
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = (Math.random() * 500 + 400) * scaleFactor;
      drawNebulaLayer(
        ctx,
        x,
        y,
        radius,
        color.start,
        color.end,
        Math.floor(Math.random() * 5) + 5
      );
    }

    const clusterX = width * 0.5 + (Math.random() - 0.5) * width * 0.4;
    const clusterY = height * 0.5 + (Math.random() - 0.5) * height * 0.4;
    const clusterRadius = (Math.random() * 100 + 150) * scaleFactor;
    drawStarCluster(ctx, clusterX, clusterY, clusterRadius, 3000, scaleFactor);
  }

  // --- THEME 2: Ring Nebula (Eye of God-like) ---
  function drawRingNebula(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scaleFactor: number
  ) {
    const centerX = width * 0.5 + (Math.random() - 0.5) * width * 0.3;
    const centerY = height * 0.5 + (Math.random() - 0.5) * height * 0.3;

    const palettes = [
      {
        outer: {
          start: themedRGBA(255, 50, 50, 0.08, 0.25),
          end: themedRGBA(255, 0, 0, 0, 0),
        },
        inner: {
          start: themedRGBA(50, 200, 255, 0.09, 0.3),
          end: themedRGBA(0, 200, 255, 0, 0),
        },
      },
      {
        outer: {
          start: themedRGBA(255, 150, 50, 0.08, 0.25),
          end: themedRGBA(255, 100, 0, 0, 0),
        },
        inner: {
          start: themedRGBA(150, 100, 255, 0.09, 0.3),
          end: themedRGBA(100, 50, 255, 0, 0),
        },
      },
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];

    const outerRadius =
      Math.min(width, height) * 0.4 * (Math.random() * 0.4 + 0.8) * scaleFactor;
    const innerRadius = outerRadius * (Math.random() * 0.3 + 0.4);

    drawNebulaLayer(
      ctx,
      centerX,
      centerY,
      outerRadius,
      palette.outer.start,
      palette.outer.end,
      12
    );
    drawNebulaLayer(
      ctx,
      centerX,
      centerY,
      innerRadius,
      palette.inner.start,
      palette.inner.end,
      10
    );
    drawDustLane(ctx, centerX, centerY, innerRadius * 0.8, 8); // Dark inner ring
  }

  // --- THEME 3: Star-Forming Region (Pillars of Creation-like) ---
  function drawStarFormingRegion(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scaleFactor: number
  ) {
    const mainColor = {
      start: themedRGBA(50, 120, 255, 0.06, 0.22),
      end: themedRGBA(0, 0, 255, 0, 0),
    };
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = (Math.random() * 400 + 400) * scaleFactor;
      drawNebulaLayer(ctx, x, y, radius, mainColor.start, mainColor.end, 6);
    }

    const clusterX = width * 0.3 + Math.random() * width * 0.4;
    const clusterY = height * 0.3 + Math.random() * height * 0.4;
    drawStarCluster(
      ctx,
      clusterX,
      clusterY,
      (Math.random() * 80 + 120) * scaleFactor,
      4000,
      scaleFactor
    );

    for (let i = 0; i < 5; i++) {
      const x = clusterX + (Math.random() - 0.5) * 500 * scaleFactor;
      const y = clusterY + (Math.random() - 0.5) * 500 * scaleFactor;
      const radius = (Math.random() * 300 + 200) * scaleFactor;
      drawDustLane(ctx, x, y, radius, 5);
    }
  }

  // --- THEME 4: Cosmic Reef (Edge-lit Cloud) ---
  function drawCosmicReef(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scaleFactor: number
  ) {
    const reefX = width * 0.5 + (Math.random() - 0.5) * width * 0.6;
    const reefY = height * 0.5 + (Math.random() - 0.5) * height * 0.6;
    const reefRadius = (Math.random() * 400 + 500) * scaleFactor;

    const palettes = [
      {
        edge: {
          start: themedRGBA(255, 180, 80, 0.08, 0.28),
          end: themedRGBA(255, 100, 0, 0, 0),
        },
        gas: {
          start: themedRGBA(80, 150, 255, 0.04, 0.15),
          end: themedRGBA(0, 100, 255, 0, 0),
        },
      },
      {
        edge: {
          start: themedRGBA(255, 100, 200, 0.08, 0.28),
          end: themedRGBA(255, 50, 150, 0, 0),
        },
        gas: {
          start: themedRGBA(100, 220, 200, 0.04, 0.15),
          end: themedRGBA(50, 200, 200, 0, 0),
        },
      },
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];

    drawDustLane(ctx, reefX, reefY, reefRadius, 10);
    drawDustLane(
      ctx,
      reefX + (Math.random() - 0.5) * 100,
      reefY + (Math.random() - 0.5) * 100,
      reefRadius * 0.8,
      8
    );

    const edgeAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < 10; i++) {
      const angle = edgeAngle + (Math.random() - 0.5) * 1.5;
      const x = reefX + Math.cos(angle) * reefRadius * 0.8;
      const y = reefY + Math.sin(angle) * reefRadius * 0.8;
      const radius = (Math.random() * 200 + 100) * scaleFactor;
      drawNebulaLayer(
        ctx,
        x,
        y,
        radius,
        palette.edge.start,
        palette.edge.end,
        5
      );
    }
  }

  // --- THEME 5: Veil Nebula (Filamentary) ---
  function drawVeilNebula(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scaleFactor: number
  ) {
    const palettes = ['255, 80, 80', '80, 180, 255', '255, 80, 200'];
    const color = palettes[Math.floor(Math.random() * palettes.length)];

    let lastX = Math.random() * width;
    let lastY = Math.random() * height;
    for (let i = 0; i < 50; i++) {
      const x2 = lastX + (Math.random() - 0.5) * width * 0.5;
      const y2 = lastY + (Math.random() - 0.5) * height * 0.5;
      drawFilament(ctx, lastX, lastY, x2, y2, color);
      if (Math.random() > 0.5) {
        lastX = x2;
        lastY = y2;
      }
    }
  }

  // --- THEME 6: Black Hole (Accretion Disk) ---
  function drawBlackHole(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scaleFactor: number
  ) {
    const centerX = width / 2 + (Math.random() - 0.5) * width * 0.2;
    const centerY = height / 2 + (Math.random() - 0.5) * height * 0.2;
    const outerRadius = (Math.random() * 150 + 100) * scaleFactor;

    // Draw the central black void
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw the accretion disk
    const palettes = [
      {
        start: themedRGBA(255, 200, 100, 0.2, 0.45),
        end: themedRGBA(255, 100, 0, 0, 0),
      },
      {
        start: themedRGBA(150, 200, 255, 0.2, 0.45),
        end: themedRGBA(50, 100, 255, 0, 0),
      },
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.scale(1, 0.3); // Flatten the disk

    for (let i = 0; i < 3000; i++) {
      const r =
        outerRadius * 0.3 + Math.pow(Math.random(), 1.5) * (outerRadius * 0.7);
      const angle = Math.random() * Math.PI * 2;
      const size = (1 - r / r) * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(
        r * Math.cos(angle),
        r * Math.sin(angle),
        size * scaleFactor,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = palette.start;
      ctx.fill();
    }
    ctx.restore();
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
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (artisticDetailsReady && artisticDetailsAlpha < 1) {
      artisticDetailsAlpha = Math.min(1, artisticDetailsAlpha + 0.015);
    }

    ctx.globalAlpha = 1;
    // Draw the pre-rendered static background
    if (staticBgCanvas) {
      ctx.drawImage(staticBgCanvas, 0, 0);
    }

    ctx.globalAlpha = artisticDetailsAlpha;

    // --- Draw DYNAMIC elements here ---

    const starColor =
      currentTheme === 'dark' ? '255, 255, 255' : '100, 100, 130'; // Darker shooting stars for light theme
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

  onMount(() => {
    // Helper to resolve 'system' theme to 'light' or 'dark'
    const resolveTheme = (theme: Theme) => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return theme;
    };

    // Initial setup
    currentTheme = resolveTheme(get(themeStore));
    init();
    animate();

    // Subscribe to theme store for any subsequent changes
    const unsubscribeTheme = themeStore.subscribe((newTheme) => {
      const effectiveTheme = resolveTheme(newTheme);
      // Only re-initialize if the effective theme has actually changed
      if (effectiveTheme !== currentTheme) {
        // FIX: Update currentTheme *before* calling init to ensure
        // the correct theme is used for cache validation and drawing.
        currentTheme = effectiveTheme;
        init();
      }
    });

    // Also listen for OS-level theme changes when in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (get(themeStore) === 'system') {
        // FIX: Update currentTheme *before* calling init.
        currentTheme = resolveTheme('system');
        init(); // Re-run init to get the new system theme
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    // Standard event listeners
    window.addEventListener('resize', init);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Cleanup all listeners and timers
      unsubscribeTheme();
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('resize', init);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
      clearInterval(shootingStarInterval);
    };
  });
</script>

<div class="canvas-container" class:is-exiting={isExiting}>
  <!-- FIX: Correct self-closing tag for <canvas> -->
  <canvas bind:this={canvasEl} class="organic-canvas" aria-hidden="true"
  ></canvas>
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
    background-color: var(
      --color-page-background,
      #f8f9fa
    ); /* Fallback to light theme page bg */
  }
</style>
