module.exports = {
  lintOnSave: true,

  devServer: process.env.NODE_ENV === 'development' ? {
    // no need for the webpack webSocketServer
    webSocketServer: false,
    host: 'localhost',
    port: 8080
  } : {},

  productionSourceMap: false
}
