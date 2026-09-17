import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import eslintReact from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierRecommendedConfig from 'eslint-plugin-prettier/recommended';

export default defineConfig(
	{ ignores: ['dist', 'ios', 'android', 'cypress.config.ts'] },
	{
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended,
			eslintReact.configs['recommended-typescript'],
		],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
			'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
			'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
			// Allow unused variables if they are prefixed with _
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
	prettierRecommendedConfig,
	// Override Prettier error → warning
	{
		rules: {
			'prettier/prettier': 'warn',
		},
	},
);
