const fs = require('fs');
module.exports = {
  lintOnSave: false,
//  publicPath: '/',

  devServer: {
    host: 'localhost',
    port: 8080,

    https: true,
    key: fs.readFileSync('C:/Users/erik.MYNETWORK/.ssl/localhost.key'),
    cert: fs.readFileSync('C:/Users/erik.MYNETWORK/.ssl/localhost.crt'),
    ca: fs.readFileSync('C:/Users/erik.MYNETWORK/.ssl/RootCA.pem')
  }
}
