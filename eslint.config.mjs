import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [tsBaseConfig, tsEslintRecommendedConfig, tsStrictTypeCheckedConfig] =
  tsPlugin.configs['flat/strict-type-checked'];

const baseTypeScriptRules = {
  ...(tsEslintRecommendedConfig?.rules ?? {}),
  ...(tsStrictTypeCheckedConfig?.rules ?? {}),
};

const reactRecommendedConfig = reactPlugin.configs.flat?.recommended ?? {};
const reactRules = reactRecommendedConfig.rules ?? {};

const reactHooksRules = reactHooksPlugin.configs.recommended?.rules ?? {};
const jsxA11yRules = jsxA11yPlugin.configs.recommended?.rules ?? {};

const disableTypeCheckedRules =
  tsPlugin.configs['flat/disable-type-checked']?.rules ?? {};

const prettierRecommendedRules = {
  ...prettierConfig.rules,
  'prettier/prettier': 'error',
};

const baseLanguageOptions = {
  ...(tsBaseConfig?.languageOptions ?? {}),
  ecmaVersion: 2022,
  parserOptions: {
    ...(tsBaseConfig?.languageOptions?.parserOptions ?? {}),
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
};

const basePlugins = {
  ...(tsBaseConfig?.plugins ?? {}),
  react: reactPlugin,
  'react-hooks': reactHooksPlugin,
  'jsx-a11y': jsxA11yPlugin,
  prettier: prettierPlugin,
};

export default [
  {
    ignores: ['dist/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ...baseLanguageOptions,
      parserOptions: {
        ...baseLanguageOptions.parserOptions,
        project: path.join(__dirname, 'tsconfig.app.json'),
      },
    },
    plugins: basePlugins,
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...baseTypeScriptRules,
      ...reactRules,
      ...jsxA11yRules,
      ...reactHooksRules,
      ...prettierRecommendedRules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
        },
      ],
    },
  },
  {
    files: ['*.config.{ts,tsx,mts,cts}'],
    languageOptions: {
      ...baseLanguageOptions,
      parserOptions: {
        ...baseLanguageOptions.parserOptions,
        project: path.join(__dirname, 'tsconfig.node.json'),
      },
    },
    plugins: basePlugins,
  },
  {
    files: ['tests/**/*.{ts,tsx}', 'vitest.setup.ts'],
    languageOptions: {
      ...baseLanguageOptions,
      parserOptions: {
        ...baseLanguageOptions.parserOptions,
        project: false,
      },
    },
    plugins: basePlugins,
    rules: {
      ...disableTypeCheckedRules,
    },
  },
];
