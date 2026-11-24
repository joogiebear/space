import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'cache/**', 'node_modules/**', 'public/**', 'docs/**', 'tools/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
      // `<script lang="ts">` blocks in .vue files are parsed with the TypeScript parser
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      // Scene code reads data that load() fills in later, and says so with `!` on purpose.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // `any` is a smell, not an error: a few third-party shapes and the Body/Scene escape hatch still use it.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // The scene registry and engine event modules intentionally keep small empty handlers.
      '@typescript-eslint/no-empty-function': 'off',
      // App.vue is the root component.
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
    },
  },

  // Node-side files: Vite config and ESLint config itself.
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Turns off every stylistic rule Prettier already owns. Keep this last.
  prettier,
);
