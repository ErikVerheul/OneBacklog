import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, './')

	return {
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url)),
			},
			extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
		},
		plugins: [
			vue(),
			Components({
				resolvers: [BootstrapVueNextResolver()],
			}),
		],
		server: { port: env.VITE_LOCAL_PORT || 3000 },
	}
})
