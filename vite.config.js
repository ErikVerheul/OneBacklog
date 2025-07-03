import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, './')

	return {
		css: {
			preprocessorOptions: {
				scss: {
					// bootstrap is not compatible with the latest version of dart-sass, see https://getbootstrap.com/docs/5.3/customize/sass/
					silenceDeprecations: ['mixed-decls', 'color-functions', 'global-builtin', 'import'], // see https://github.com/sass/dart-sass/issues/1234
					additionalData: ` // loaded globally
          @use "bootstrap-vue-next/dist/bootstrap-vue-next.css";
          @use "@/css/onebacklog.scss";
        `,
				},
			},
		},
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
