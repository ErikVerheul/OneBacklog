const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true
})
const fs = require('fs')
// eslint-disable-next-line no-console
console.log('process.env.NODE_ENV = ' + process.env.NODE_ENV)
// eslint-disable-next-line no-console
if (process.env.NODE_ENV === 'development') console.log('process.env.VUE_APP_SSL_PATH = ' + process.env.VUE_APP_SSL_PATH)
module.exports = {
  chainWebpack: (config) => {
    config.resolve.alias.set('vue', '@vue/compat')

    config.module
      .rule('vue')
      .use('vue-loader')
      .tap((options) => {
        return {
          ...options,
          compilerOptions: {
            compatConfig: {
              MODE: 2
            }
          }
        }
      })
  },

  lintOnSave: true,

  devServer: process.env.NODE_ENV === 'development' ? {
    host: 'localhost',
    port: 8080,
    server: {
      type: "https",
      options: {
        key: fs.readFileSync(process.env.VUE_APP_SSL_PATH + '/localhost.key'),
        cert: fs.readFileSync(process.env.VUE_APP_SSL_PATH + '/localhost.crt')
      }
    },
  } : {},

  productionSourceMap: false
}
