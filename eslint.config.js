import { FlatCompat } from '@eslint/eslintrc';
import typescript from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

const compat = new FlatCompat({
  recommendedConfig: {}
});

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
    },
  },
  ...compat.extends('eslint:recommended'),
];
