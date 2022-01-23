import { defineConfig } from 'vite'
import fs from 'fs'
// import vue from '@vitejs/plugin-vue' for Vue3
import { createVuePlugin as vue } from "vite-plugin-vue2" // for Vue2

// see https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
	if (command === 'serve') {
		// it is important to note that in Vite's API the command value is serve during dev (in the cli vite, vite dev, and vite serve are aliases), and build when building for production (vite build)
		// eslint - disable - next - line no- console
		console.log('Development environment is called')
		return {
			plugins: [vue()],
			// dev specific config
			server: {
				port: 8080,
				https: {
					key: fs.readFileSync('./localhost-certs/localhost.key'),
					cert: fs.readFileSync('./localhost-certs/localhost.crt')
				},
			}

		}
	} else {
		// command === 'build'
		// eslint - disable - next - line no- console
		console.log('production environment is called')
		return {
			plugins: [vue()]
			// build specific config

		}
	}
})

