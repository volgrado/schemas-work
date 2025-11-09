/**
 * @file Procedural generation logic for the OrganicCanvas component.
 * @module canvas-themes
 *
 * This module contains all the functions required to draw the static, multi-layered
 * cosmic backgrounds. By separating this logic from the Svelte component, we make
 * the component itself much cleaner and focused on state management and the animation loop.
 */

export type CanvasTheme = 'light' | 'dark';

// --- Internal Drawing Helpers ---

function themedRGBA(
  r: number,
  g: number,
  b: number,
  darkA: number,
  lightA: number,
  theme: CanvasTheme
): string {
  const alpha = theme === 'dark' ? darkA : lightA * 1.5;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawNebulaLayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colorStart: string,
  colorEnd: string,
  theme: CanvasTheme,
  complexity: number = 5
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
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
  complexity: number,
  theme: CanvasTheme
): void {
  const colorStart =
    theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)';
  const colorEnd =
    theme === 'dark' ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)';
  ctx.save();
  ctx.globalCompositeOperation = theme === 'dark' ? 'multiply' : 'screen';
  drawNebulaLayer(ctx, x, y, radius, colorStart, colorEnd, theme, complexity);
  ctx.restore();
}

function drawStarCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  density: number,
  scaleFactor: number,
  theme: CanvasTheme
): void {
  ctx.save();
  ctx.translate(x, y);
  const starColor = theme === 'dark' ? '220, 220, 255' : '120, 120, 150';
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
  const coreGlow = theme === 'dark' ? '255, 255, 255' : '200, 200, 220';
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
  color: string,
  theme: CanvasTheme
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const cp1x = x1 + (Math.random() - 0.5) * (x2 - x1) * 2;
  const cp1y = y1 + (Math.random() - 0.5) * (y2 - y1) * 2;
  const cp2x = x2 - (Math.random() - 0.5) * (x2 - x1) * 2;
  const cp2y = y2 - (Math.random() - 0.5) * (y2 - y1) * 2;
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
  const opacity = theme === 'dark' ? 0.15 : 0.5;
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, `rgba(${color}, 0)`);
  gradient.addColorStop(0.5, `rgba(${color}, ${opacity})`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = Math.random() * 2 + 1;
  ctx.stroke();
  ctx.restore();
}

// --- Internal Theme Generators ---

function drawDiffuseNebula(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: number,
  theme: CanvasTheme
): void {
  const palettes = [
    [
      {
        start: themedRGBA(255, 120, 50, 0.05, 0.2, theme),
        end: themedRGBA(255, 0, 0, 0, 0, theme),
      },
      {
        start: themedRGBA(50, 120, 255, 0.04, 0.18, theme),
        end: themedRGBA(0, 0, 255, 0, 0, theme),
      },
    ],
    [
      {
        start: themedRGBA(255, 50, 180, 0.05, 0.2, theme),
        end: themedRGBA(200, 0, 200, 0, 0, theme),
      },
      {
        start: themedRGBA(80, 220, 200, 0.04, 0.18, theme),
        end: themedRGBA(0, 255, 255, 0, 0, theme),
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
      theme,
      Math.floor(Math.random() * 5) + 5
    );
  }
  const clusterX = width * 0.5 + (Math.random() - 0.5) * width * 0.4;
  const clusterY = height * 0.5 + (Math.random() - 0.5) * height * 0.4;
  const clusterRadius = (Math.random() * 100 + 150) * scaleFactor;
  drawStarCluster(
    ctx,
    clusterX,
    clusterY,
    clusterRadius,
    3000,
    scaleFactor,
    theme
  );
}

function drawRingNebula(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: number,
  theme: CanvasTheme
): void {
  const centerX = width * 0.5 + (Math.random() - 0.5) * width * 0.3;
  const centerY = height * 0.5 + (Math.random() - 0.5) * height * 0.3;
  const palettes = [
    {
      outer: {
        start: themedRGBA(255, 50, 50, 0.08, 0.25, theme),
        end: themedRGBA(255, 0, 0, 0, 0, theme),
      },
      inner: {
        start: themedRGBA(50, 200, 255, 0.09, 0.3, theme),
        end: themedRGBA(0, 200, 255, 0, 0, theme),
      },
    },
    {
      outer: {
        start: themedRGBA(255, 150, 50, 0.08, 0.25, theme),
        end: themedRGBA(255, 100, 0, 0, 0, theme),
      },
      inner: {
        start: themedRGBA(150, 100, 255, 0.09, 0.3, theme),
        end: themedRGBA(100, 50, 255, 0, 0, theme),
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
    theme,
    12
  );
  drawNebulaLayer(
    ctx,
    centerX,
    centerY,
    innerRadius,
    palette.inner.start,
    palette.inner.end,
    theme,
    10
  );
  drawDustLane(ctx, centerX, centerY, innerRadius * 0.8, 8, theme);
}

function drawStarFormingRegion(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: number,
  theme: CanvasTheme
): void {
  const mainColor = {
    start: themedRGBA(50, 120, 255, 0.06, 0.22, theme),
    end: themedRGBA(0, 0, 255, 0, 0, theme),
  };
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = (Math.random() * 400 + 400) * scaleFactor;
    drawNebulaLayer(
      ctx,
      x,
      y,
      radius,
      mainColor.start,
      mainColor.end,
      theme,
      6
    );
  }
  const clusterX = width * 0.3 + Math.random() * width * 0.4;
  const clusterY = height * 0.3 + Math.random() * height * 0.4;
  drawStarCluster(
    ctx,
    clusterX,
    clusterY,
    (Math.random() * 80 + 120) * scaleFactor,
    4000,
    scaleFactor,
    theme
  );
  for (let i = 0; i < 5; i++) {
    const x = clusterX + (Math.random() - 0.5) * 500 * scaleFactor;
    const y = clusterY + (Math.random() - 0.5) * 500 * scaleFactor;
    const radius = (Math.random() * 300 + 200) * scaleFactor;
    drawDustLane(ctx, x, y, radius, 5, theme);
  }
}

function drawCosmicReef(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: number,
  theme: CanvasTheme
): void {
  const reefX = width * 0.5 + (Math.random() - 0.5) * width * 0.6;
  const reefY = height * 0.5 + (Math.random() - 0.5) * height * 0.6;
  const reefRadius = (Math.random() * 400 + 500) * scaleFactor;
  const palettes = [
    {
      edge: {
        start: themedRGBA(255, 180, 80, 0.08, 0.28, theme),
        end: themedRGBA(255, 100, 0, 0, 0, theme),
      },
      gas: {
        start: themedRGBA(80, 150, 255, 0.04, 0.15, theme),
        end: themedRGBA(0, 100, 255, 0, 0, theme),
      },
    },
    {
      edge: {
        start: themedRGBA(255, 100, 200, 0.08, 0.28, theme),
        end: themedRGBA(255, 50, 150, 0, 0, theme),
      },
      gas: {
        start: themedRGBA(100, 220, 200, 0.04, 0.15, theme),
        end: themedRGBA(50, 200, 200, 0, 0, theme),
      },
    },
  ];
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  drawDustLane(ctx, reefX, reefY, reefRadius, 10, theme);
  drawDustLane(
    ctx,
    reefX + (Math.random() - 0.5) * 100,
    reefY + (Math.random() - 0.5) * 100,
    reefRadius * 0.8,
    8,
    theme
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
      theme,
      5
    );
  }
}

function drawVeilNebula(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: number,
  theme: CanvasTheme
): void {
  const palettes = ['255, 80, 80', '80, 180, 255', '255, 80, 200'];
  const color = palettes[Math.floor(Math.random() * palettes.length)];
  let lastX = Math.random() * width;
  let lastY = Math.random() * height;
  for (let i = 0; i < 50; i++) {
    const x2 = lastX + (Math.random() - 0.5) * width * 0.5;
    const y2 = lastY + (Math.random() - 0.5) * height * 0.5;
    drawFilament(ctx, lastX, lastY, x2, y2, color, theme);
    if (Math.random() > 0.5) {
      lastX = x2;
      lastY = y2;
    }
  }
}

function drawBlackHole(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: number,
  theme: CanvasTheme
): void {
  const centerX = width / 2 + (Math.random() - 0.5) * width * 0.2;
  const centerY = height / 2 + (Math.random() - 0.5) * height * 0.2;
  const outerRadius = (Math.random() * 150 + 100) * scaleFactor;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const palettes = [
    {
      start: themedRGBA(255, 200, 100, 0.2, 0.45, theme),
      end: themedRGBA(255, 100, 0, 0, 0, theme),
    },
    {
      start: themedRGBA(150, 200, 255, 0.2, 0.45, theme),
      end: themedRGBA(50, 100, 255, 0, 0, theme),
    },
  ];
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((Math.random() - 0.5) * 0.5);
  ctx.scale(1, 0.3);
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

function drawBrightStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  theme: CanvasTheme
): void {
  const starColor = theme === 'dark' ? '255, 255, 255' : '180, 180, 200';
  const alpha = Math.random() * 0.7 + 0.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${starColor}, ${alpha})`;
  ctx.fill();
  const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
  glowGradient.addColorStop(0, `rgba(${starColor}, ${alpha * 0.3})`);
  glowGradient.addColorStop(1, `rgba(${starColor}, 0)`);
  ctx.fillStyle = glowGradient;
  ctx.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6);
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

// --- EXPORTED FUNCTIONS ---

/**
 * Draws the base layer of stars onto the canvas context.
 */
export function drawStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: CanvasTheme
): void {
  const scaleFactor = Math.max(0.5, Math.min(width / 1200, 1.2));
  const densities = [15000, 12000, 18000];
  const radii = [0.4, 0.8, 1.2];
  const starColor = theme === 'dark' ? '220, 220, 255' : '100, 100, 130';

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
    drawBrightStar(ctx, x, y, radius, theme);
  }
}

/**
 * Draws one of several randomly chosen artistic themes (nebulae, etc.) onto the canvas.
 */
export function drawArtisticDetails(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: CanvasTheme
): void {
  const scaleFactor = Math.max(0.5, Math.min(width / 1200, 1.2));
  const themeRoll = Math.random();

  if (themeRoll < 0.167)
    drawDiffuseNebula(ctx, width, height, scaleFactor, theme);
  else if (themeRoll < 0.334)
    drawRingNebula(ctx, width, height, scaleFactor, theme);
  else if (themeRoll < 0.501)
    drawStarFormingRegion(ctx, width, height, scaleFactor, theme);
  else if (themeRoll < 0.668)
    drawCosmicReef(ctx, width, height, scaleFactor, theme);
  else if (themeRoll < 0.835)
    drawVeilNebula(ctx, width, height, scaleFactor, theme);
  else drawBlackHole(ctx, width, height, scaleFactor, theme);
}
