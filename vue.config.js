module.exports = {
  lintOnSave: true,

  devServer: process.env.NODE_ENV === 'development' ? {
    // the webpack webSocketServer is needed for auto-refreshing the app on changes
    // webSocketServer: false,
    host: 'localhost',
    port: 8080
  } : {},

  productionSourceMap: false
}
