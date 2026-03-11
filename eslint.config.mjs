import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';
import pluginImport from 'eslint-plugin-import';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const eslintConfig = [
  {
    ignores: [
      // Dependencies
      '**/node_modules/**',
      // TypeScript / Next.js build artifacts
      'apps/frontend/.next/**',
      'apps/frontend/out/**',
      'apps/frontend/next-env.d.ts',
      'apps/frontend/public/**',
      // Backend build artifacts
      'apps/backend/dist/**',
      // Core build artifacts
      'core/dist/**',
      // Lockfile
      'pnpm-lock.yaml',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  ...tseslint.configs.recommended,

  pluginReact.configs.flat.recommended,

  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  {
    plugins: {
      import: pluginImport,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // TypeScript
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-restricted-imports': ['error', { patterns: ['./*', '../*'] }],

      // Import order — monorepo-aware path groups
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal'],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'next/**', group: 'external', position: 'before' },
            {
              pattern: '@f1-telemetry/**',
              group: 'internal',
              position: 'before',
            },
            { pattern: '@services/**', group: 'internal', position: 'after' },
            { pattern: '@utils/**', group: 'internal', position: 'after' },
            { pattern: '@/hooks/**', group: 'internal', position: 'after' },
            {
              pattern: '@/components/**',
              group: 'internal',
              position: 'after',
            },
            { pattern: '@/lib/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Barrel index files must use relative paths — override the no-restricted-imports rule for them
  {
    files: ['**/src/index.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  prettierConfig,
];

export default eslintConfig;
