import prettier from 'eslint-config-prettier';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';
import boundaries from 'eslint-plugin-boundaries';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        {
          type: 'core',
          pattern: 'src/lib/core',
        },
        {
          type: 'module',
          pattern: 'src/lib/modules/*',
          capture: ['moduleName'],
        },
        {
          type: 'app',
          pattern: 'src/routes',
        },
      ],
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'off',
      // Boundaries Rules
      'boundaries/no-unknown': 'error',
      'boundaries/no-unknown-files': 'off',
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: 'core',
              disallow: ['module', 'app'],
              message: 'Core cannot import from Modules or App',
            },
            {
              from: 'module',
              disallow: [
                ['module', { moduleName: '!${moduleName}' }], // Cannot import other modules
              ],
              message: 'Modules cannot import other modules directly. Use public API if available.',
            },
          ],
        },
      ],
      // Enforce Public API (index.ts) for cross-module imports
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              target: 'module',
              allow: 'index.ts', // Only allow importing from index.ts of a module
            },
            {
              target: 'core',
              allow: '**/*', // Core is open for now, or restrict later
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig,
      },
    },
  }
);
