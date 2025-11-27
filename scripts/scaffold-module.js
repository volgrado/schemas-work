import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Please provide a module name.');
  console.error('Usage: npm run new:module <module-name>');
  process.exit(1);
}

// Ensure module name is kebab-case
const formattedName = moduleName
  .replace(/([a-z])([A-Z])/g, '$1-$2')
  .replace(/[\s_]+/g, '-')
  .toLowerCase();

const modulesDir = path.resolve(__dirname, '../src/lib/modules');
const targetDir = path.join(modulesDir, formattedName);

if (fs.existsSync(targetDir)) {
  console.error(`❌ Module "${formattedName}" already exists.`);
  process.exit(1);
}

console.log(`🏗️  Scaffolding module: ${formattedName}...`);

// Create directories
const dirs = ['ui', 'domain', 'infra'];
dirs.forEach((dir) => {
  fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
});

// Create barrel file
const indexContent = `/**
 * @file Public API for the ${formattedName} module.
 * @module @modules/${formattedName}
 */

// export * from './ui/Component.svelte';
// export * from './domain/types';
`;
fs.writeFileSync(path.join(targetDir, 'index.ts'), indexContent);

// Create README
const readmeContent = `# ${formattedName} Module

## Overview
Domain logic and UI for ${formattedName}.

## Structure
- \`domain/\`: Business logic, types, and pure functions.
- \`ui/\`: Svelte components.
- \`infra/\`: External services and adapters.
`;
fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);

console.log(`✅ Module "${formattedName}" created successfully!`);
console.log(`📂 Location: src/lib/modules/${formattedName}`);
