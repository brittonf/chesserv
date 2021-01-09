const path = require('path');

module.exports = {
  entry: './client.js',
  mode: 'development',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, '../static/bin'),
  },
};
