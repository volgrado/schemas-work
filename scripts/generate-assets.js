// scripts/generate-assets.js
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Define the source SVG and the output directory for static assets.
const sourceSVG = 'static/favicon.svg';
const outputDir = 'static';

// Define the different icon sizes and configurations we need to generate.
const iconConfigs = [
  // Standard PNG favicons for modern browsers
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },

  // Icon for Apple devices (e.g., when added to home screen)
  { name: 'apple-touch-icon.png', size: 180 },

  // Icons for the Web App Manifest (PWA)
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

/**
 * Main function to generate all assets.
 */
async function generateAssets() {
  try {
    console.log('✨ Starting asset generation from favicon.svg...');

    // Ensure the output directory exists.
    await fs.mkdir(outputDir, { recursive: true });

    // --- Generate PNGs ---
    // Use Promise.all to generate all PNG files in parallel for efficiency.
    await Promise.all(
      iconConfigs.map(async (config) => {
        const outputPath = path.join(outputDir, config.name);
        await sharp(sourceSVG)
          .resize(config.size, config.size)
          .toFile(outputPath);
        console.log(`✅ Generated ${config.name}`);
      })
    );

    // --- Generate favicon.ico ---
    // The .ico format can contain multiple sizes. We'll use the 16x16 and 32x32 versions.
    // Sharp can't directly create .ico, so we create PNGs and then convert.
    // Note: For a true multi-size .ico, a more complex tool might be needed,
    // but a single 32x32 PNG converted to ICO is widely supported.
    const icoOutputPath = path.join(outputDir, 'favicon.ico');
    await sharp(path.join(outputDir, 'favicon-32x32.png')).toFile(
      icoOutputPath
    );
    console.log('✅ Generated favicon.ico');

    console.log('🎉 Asset generation complete!');
  } catch (error) {
    console.error('❌ An error occurred during asset generation:', error);
    process.exit(1); // Exit with an error code
  }
}

// Run the generation process.
generateAssets();
