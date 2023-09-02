module.exports = {
  lintOnSave: true,

  devServer: process.env.NODE_ENV === 'development' ? {
    host: 'localhost',
    port: 8080
  } : {},

  productionSourceMap: false
}
