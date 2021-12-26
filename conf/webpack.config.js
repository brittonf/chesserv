const path = require('path');

module.exports = {
  entry: './src/client.js',
  mode: 'development',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, '../../../node-servers/nutz_server/www/bin'),
  },
};
