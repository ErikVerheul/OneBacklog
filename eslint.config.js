import eslintPluginVue from 'eslint-plugin-vue'
import eslintPluginImport from 'eslint-plugin-import'
import vueParser from 'vue-eslint-parser'
import pluginTs from '@typescript-eslint/eslint-plugin'
import pluginPrettier from 'eslint-plugin-prettier'

export default [
	// Base config for all JS/TS files (excluding .vue)
	{
		files: ['**/*.{js,cjs,mjs,jsx,ts,tsx}'],
		ignores: ['dist/**', '**/node_modules/**', '**/mailservice/**', '**/components.d.ts'],
		languageOptions: {
			parser: undefined, // use default JS parser here; override where needed
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					globalReturn: false,
					impliedStrict: false,
					jsx: true,
				},
				project: ['./tsconfig.json'],
			},
		},
		plugins: {
			'@typescript-eslint': pluginTs,
			import: eslintPluginImport,
			prettier: pluginPrettier,
		},
		rules: {
			// stylistic / formatter (use Prettier) — keep in one place
			'prettier/prettier': 'error',

			// possible errors
			'no-undef': 'off', // handled by TS for TS files; keep off to avoid false positives in .ts
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^\_', varsIgnorePattern: '^\_' }],

			// import resolution
			'import/no-unresolved': 'error',

			// TypeScript specifics
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': 'allow-with-description' }],
		},
		settings: {
			'import/resolver': {
				typescript: { project: './tsconfig.json' },
				node: { extensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.vue'] },
			},
		},
	},

	// .vue single-file components: enable vue parser & plugin, plus Vue rules
	{
		files: ['\*\*/\*.vue', '\*.vue'],
		ignores: ['dist/**', '**/node_modules/**', '**/mailservice/**', '**/components.d.ts'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: '@typescript-eslint/parser',
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					globalReturn: false,
					impliedStrict: false,
					jsx: false,
				},
				extraFileExtensions: ['.vue'],
			},
		},
		plugins: { vue: eslintPluginVue, prettier: pluginPrettier },
		rules: {
			// prefer using script setup and enforce recommended SFC rules
			'vue/component-definition-name-casing': ['warn', 'PascalCase'],
			'vue/require-default-prop': 'off',
			// keep formatter rules in one block but allow Vue-specific style
			'prettier/prettier': 'error',
			// project style rule (single source for stylistic fixers)
			semi: ['error', 'never'],
			// Vue template rules
			'vue/no-multiple-template-root': 'off',
		},
	},

	// TypeScript-only files: stricter TS rules (use same TS plugin but avoid re-registering parser)
	{
		files: ['\*\*/\*.{ts,tsx}'],
		ignores: ['dist/**', '**/node_modules/**', '**/mailservice/**', '**/components.d.ts'],
		languageOptions: {
			// leave parser undefined so TS rules come from @typescript-eslint plugin without reapplying vueParser
			parser: undefined,
			parserOptions: { project: ['./tsconfig.json'], ecmaVersion: 'latest', sourceType: 'module' },
		},
		plugins: { '@typescript-eslint': pluginTs },
		rules: {
			'@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
			'@typescript-eslint/no-floating-promises': 'error',
		},
	},

	// JavaScript-only files: enable JS-specific rules (no duplicate parser/plugins)
	{
		files: ['\*\*/\*.{js,cjs,mjs,jsx}'],
		ignores: ['dist/**', '**/node_modules/**', '**/mailservice/**', '**/components.d.ts'],
		languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
		rules: {
			'no-unused-vars': ['warn', { argsIgnorePattern: '^\_', varsIgnorePattern: '^\_' }],
		},
	},
]
