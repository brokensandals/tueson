const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'target', 'umd'),
    filename: 'tueson.min.js',
    library: 'Tueson',
    libraryTarget: 'umd',
  },
};
