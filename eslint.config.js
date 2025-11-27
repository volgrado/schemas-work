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
          pattern: 'src/lib/core/**/*',
        },
        {
          type: 'module',
          pattern: 'src/lib/modules/*/**/*',
          capture: ['moduleName'],
        },
        {
          type: 'app',
          pattern: 'src/routes/**/*',
        },
        {
          type: 'shared',
          pattern: 'src/lib/utils/**/*',
        },
        {
          type: 'shared',
          pattern: 'src/lib/types/**/*',
        },
        {
          type: 'shared',
          pattern: 'src/lib/styles/**/*',
        },
        {
          type: 'shared',
          pattern: 'src/lib/workers/**/*',
        },
        {
          type: 'shared',
          pattern: 'src/lib/actions/**/*',
        },
        {
          type: 'shared',
          pattern: 'src/lib/assets/**/*',
        },
        {
          type: 'shared',
          pattern: 'src/lib/locales/**/*',
        },
        {
          type: 'shared',
          pattern: 'src/lib/*.ts', // Matches constants.ts
        },
        {
          type: 'root',
          pattern: 'src/*', // Matches files directly in src like service-worker.ts
        },
      ],
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'off',
      // Boundaries Rules
      'boundaries/no-unknown': 'off',
      'boundaries/no-unknown-files': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      'prefer-const': 'warn',
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'svelte/require-each-key': 'warn',
      'svelte/no-at-html-tags': 'warn',
      'svelte/prefer-writable-derived': 'warn',
      'svelte/prefer-svelte-reactivity': 'warn',
      'svelte/no-dom-manipulating': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
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
              message:
                'Modules cannot import other modules directly. Use public API if available.',
            },
            {
              from: 'shared',
              disallow: ['app', 'module'],
              message: 'Shared utilities cannot import from App or Modules',
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
