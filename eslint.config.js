import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'

export default [
	{ files: ['**/*.{js,mjs,cjs,vue}'] },
	{
		languageOptions: {
			sourceType: 'module',
			globals: globals.browser,
		},
	},
	...pluginVue.configs['flat/essential'],
	{
		ignores: ['**/dist/', '**/mailservice/'],
	},
]
