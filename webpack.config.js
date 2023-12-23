'use strict';

const path = require('path');

module.exports = {
  entry: {
    background: ['./src/background.js'],
    'content-script': ['./src/content-script.js'],
    injected: ['./src/injected.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'app/scripts'),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /codemirror\/mode\/meta/,
        loader: 'string-replace-loader',
        options: {
          search: '../lib/codemirror',
          replace: 'dummy-codemirror',
        },
      },
    ],
  },
  resolve: {
    alias: {
      'ac-util': path.join(__dirname, 'src', 'util'),
      'dummy-codemirror': path.join(__dirname, 'src', 'shims', 'codemirror'),
    },
  },
  externals: {
    chrome: 'chrome',
  },
};
