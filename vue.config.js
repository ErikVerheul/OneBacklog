module.exports = {
  lintOnSave: true,

  devServer: process.env.NODE_ENV === 'development' ? {
    host: 'localhost',
    port: 8080,
    // https: {
    //   key: fs.readFileSync(process.env.VUE_APP_SSL_PATH + '/localhost.key'),
    //   cert: fs.readFileSync(process.env.VUE_APP_SSL_PATH + '/localhost.crt')
    // },
  } : {},

  productionSourceMap: false
}
