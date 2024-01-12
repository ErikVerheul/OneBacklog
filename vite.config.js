import { defineConfig } from 'vite'
import vue from "@vitejs/plugin-vue"
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import {BootstrapVueNextResolver} from 'unplugin-vue-components/resolvers'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    },
  },
  plugins: [
    vue(),
    Components({
      resolvers: [BootstrapVueNextResolver()],
    }),
  ],
  server: { port: 8080 }
})