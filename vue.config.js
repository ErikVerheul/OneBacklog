const fs = require('fs')
// eslint-disable-next-line no-console
console.log('process.env.NODE_ENV = ' + process.env.NODE_ENV)
// eslint-disable-next-line no-console
if (process.env.NODE_ENV === 'development') console.log('process.env.VUE_APP_SSL_PATH = ' + process.env.VUE_APP_SSL_PATH)
module.exports = {
  lintOnSave: true,

  devServer: process.env.NODE_ENV === 'development' ? {
    host: 'localhost',
    port: 8080,
    https: true,
    key: fs.readFileSync(process.env.VUE_APP_SSL_PATH + '/localhost.key'),
    cert: fs.readFileSync(process.env.VUE_APP_SSL_PATH + '/localhost.crt'),
    ca: fs.readFileSync(process.env.VUE_APP_SSL_PATH + '/RootCA.pem')
  } : {},

  productionSourceMap: false
}
