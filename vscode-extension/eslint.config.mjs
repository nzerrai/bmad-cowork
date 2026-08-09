// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // test/stubs/vscode/index.js is a static CommonJS no-op stub (see its
    // own header comment) that only exists so the bare 'vscode' specifier
    // resolves on disk for node:test's module mocking — it's not code under
    // test, so it's excluded here rather than fought with ESM lint rules.
    ignores: ['out/**', 'node_modules/**', '*.vsix', 'test/stubs/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
);
