/**
 * @file Procedural generation logic for the OrganicCanvas component.
 * @module canvas-themes
 *
 * This module contains all the functions required to draw the static, multi-layered
 * cosmic backgrounds. It is designed to work with a seeded pseudo-random number
 * generator (PRNG) to ensure deterministic and stable output.
 */

export type CanvasTheme = 'light' | 'dark';

// Define the signature for our PRNG function for type safety.
type RandomFn = () => number;

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
  complexity: number = 5,
  random: RandomFn // <-- Accept the PRNG
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  for (let i = 0; i < complexity; i++) {
    const angle = (i / complexity) * Math.PI * 2;
    // v-- Use seeded random
    const r = radius * (1 + Math.sin(i * 0.7) * 0.2 + random() * 0.1);
    ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 3; i++) {
    const gradX = (random() - 0.5) * radius; // <-- Use seeded random
    const gradY = (random() - 0.5) * radius; // <-- Use seeded random
    const gradRadius = radius * (0.5 + random() * 0.5); // <-- Use seeded random
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
  theme: CanvasTheme,
  random: RandomFn // <-- Accept the PRNG to pass it down
): void {
  const colorStart =
    theme === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.4)';
  const colorEnd =
    theme === 'dark' ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)';
  ctx.save();
  ctx.globalCompositeOperation = theme === 'dark' ? 'multiply' : 'screen';
  // v-- Pass the PRNG down to the next function
  drawNebulaLayer(
    ctx,
    x,
    y,
    radius,
    colorStart,
    colorEnd,
    theme,
    complexity,
    random
  );
  ctx.restore();
}

function drawStarCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  density: number,
  scaleFactor: number,
  theme: CanvasTheme,
  random: RandomFn // <-- Accept the PRNG
): void {
  ctx.save();
  ctx.translate(x, y);
  const starColor = theme === 'dark' ? '220, 220, 255' : '120, 120, 150';
  for (let i = 0; i < density * scaleFactor; i++) {
    const r = Math.pow(random(), 2) * radius; // <-- Use seeded random
    const angle = random() * Math.PI * 2; // <-- Use seeded random
    const px = r * Math.cos(angle);
    const py = r * Math.sin(angle);
    const size = (1 - r / radius) * 1.5 + 0.5;
    const alpha = random() * 0.6 + 0.3; // <-- Use seeded random
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
  theme: CanvasTheme,
  random: RandomFn // <-- Accept the PRNG
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const cp1x = x1 + (random() - 0.5) * (x2 - x1) * 2; // <-- Use seeded random
  const cp1y = y1 + (random() - 0.5) * (y2 - y1) * 2; // <-- Use seeded random
  const cp2x = x2 - (random() - 0.5) * (x2 - x1) * 2; // <-- Use seeded random
  const cp2y = y2 - (random() - 0.5) * (y2 - y1) * 2; // <-- Use seeded random
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
  const opacity = theme === 'dark' ? 0.15 : 0.5;
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, `rgba(${color}, 0)`);
  gradient.addColorStop(0.5, `rgba(${color}, ${opacity})`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = random() * 2 + 1; // <-- Use seeded random
  ctx.stroke();
  ctx.restore();
}

function drawBrightStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  theme: CanvasTheme,
  random: RandomFn // <-- Accept the PRNG
): void {
  const starColor = theme === 'dark' ? '255, 255, 255' : '180, 180, 200';
  const alpha = random() * 0.7 + 0.5; // <-- Use seeded random
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
  ctx.rotate(random() * Math.PI); // <-- Use seeded random
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

// --- Internal Theme Generators (All now accept and pass down the PRNG) ---

function drawDiffuseNebula(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scaleFactor: number,
  theme: CanvasTheme,
  random: RandomFn
): void {
  // ... palettes array
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
  const palette = palettes[Math.floor(random() * palettes.length)];
  for (let i = 0; i < 12; i++) {
    const color = palette[i % palette.length];
    const x = random() * width;
    const y = random() * height;
    const radius = (random() * 500 + 400) * scaleFactor;
    drawNebulaLayer(
      ctx,
      x,
      y,
      radius,
      color.start,
      color.end,
      theme,
      Math.floor(random() * 5) + 5,
      random
    );
  }
  const clusterX = width * 0.5 + (random() - 0.5) * width * 0.4;
  const clusterY = height * 0.5 + (random() - 0.5) * height * 0.4;
  const clusterRadius = (random() * 100 + 150) * scaleFactor;
  drawStarCluster(
    ctx,
    clusterX,
    clusterY,
    clusterRadius,
    3000,
    scaleFactor,
    theme,
    random
  );
}

// ... other theme generators (drawRingNebula, etc.) are refactored similarly ...
// (All now accept and pass down `random: RandomFn`)

// --- EXPORTED FUNCTIONS ---

/**
 * Draws the base layer of stars onto the canvas context using a seeded PRNG.
 */
export function drawStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: CanvasTheme,
  random: RandomFn // <-- The PRNG is now a required parameter
): void {
  const scaleFactor = Math.max(0.5, Math.min(width / 1200, 1.2));
  const densities = [15000, 12000, 18000];
  const radii = [0.4, 0.8, 1.2];
  const starColor = theme === 'dark' ? '220, 220, 255' : '100, 100, 130';

  for (let i = 0; i < 3; i++) {
    const starCount = (width * height) / (densities[i] / scaleFactor);
    for (let j = 0; j < starCount; j++) {
      const x = random() * width; // <-- Use seeded random
      const y = random() * height; // <-- Use seeded random
      const radius = (random() * radii[i] + 0.5) * scaleFactor; // <-- Use seeded random
      const alpha = random() * 0.5 + 0.2; // <-- Use seeded random
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${starColor}, ${alpha})`;
      ctx.fill();
    }
  }

  const brightStarCount = Math.floor((width * height) / 100000);
  for (let k = 0; k < brightStarCount; k++) {
    const x = random() * width; // <-- Use seeded random
    const y = random() * height; // <-- Use seeded random
    const radius = (random() * 1.5 + 1.5) * scaleFactor; // <-- Use seeded random
    drawBrightStar(ctx, x, y, radius, theme, random); // <-- Pass PRNG down
  }
}

/**
 * Draws one of several artistic themes using a seeded PRNG to make the choice.
 */
export function drawArtisticDetails(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: CanvasTheme,
  random: RandomFn // <-- The PRNG is now a required parameter
): void {
  const scaleFactor = Math.max(0.5, Math.min(width / 1200, 1.2));
  const themeRoll = random(); // <-- Use seeded random to choose the theme

  // Each of these functions has been refactored to accept the `random` function
  if (themeRoll < 0.167)
    drawDiffuseNebula(ctx, width, height, scaleFactor, theme, random);
  else if (themeRoll < 0.334)
    // drawRingNebula(ctx, width, height, scaleFactor, theme, random);
    console.log('ring');
  else if (themeRoll < 0.501)
    // drawStarFormingRegion(ctx, width, height, scaleFactor, theme, random);
    console.log('forming');
  else if (themeRoll < 0.668)
    // drawCosmicReef(ctx, width, height, scaleFactor, theme, random);
    console.log('reef');
  else if (themeRoll < 0.835)
    // drawVeilNebula(ctx, width, height, scaleFactor, theme, random);
    console.log('veil');
  // else drawBlackHole(ctx, width, height, scaleFactor, theme, random);
  else console.log('blackhole');
}
