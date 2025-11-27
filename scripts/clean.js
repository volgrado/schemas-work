import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');

const pathsToDelete = [
  '.svelte-kit',
  'build',
  'coverage',
  'node_modules',
  'playwright-report',
  'test-results',
  'package-lock.json'
];

console.log('🧹 Starting deep clean...');

pathsToDelete.forEach((dir) => {
  const fullPath = path.join(rootDir, dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Deleted: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${dir}:`, error.message);
    }
  } else {
    console.log(`Start skipped: ${dir} (not found)`);
  }
});

console.log('✨ Deep clean complete! Run "npm install" to reinstall dependencies.');
