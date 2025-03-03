import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { fileURLToPath } from 'node:url'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'

export default defineConfig({
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
		extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
	},
	plugins: [
		vue(),
		dts(),
		Components({
			resolvers: [BootstrapVueNextResolver()],
		}),
	],
	server: { port: 8080 },
})
