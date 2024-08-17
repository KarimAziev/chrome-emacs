'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { merge } = require('webpack-merge');

const baseConfig = {
  entry: {
    'service-worker': ['./src/service-worker.ts'],
    'content-script': ['./src/content-script.ts'],
    'query-edit': ['./src/query-edit.ts'],
    injected: ['./src/injected.ts'],
    options: ['./src/options/options.ts'],
  },
  output: {
    filename: '[name].js',
  },
  mode: 'production',
  module: {
    rules: [
      { test: /\.([cm]?ts|tsx)$/, loader: 'ts-loader' },
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
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.join(__dirname, 'src'),
      'dummy-codemirror': path.join(__dirname, 'src', 'shims', 'codemirror'),
    },
  },
  externals: {
    chrome: 'chrome',
  },
};

/**
 * Export the configurations based on environment variable or command line argument
 * @param {object} env
 * @param {object} argv
 * @returns {import('webpack').Configuration}
 */
module.exports = (env, argv) => {
  const isFirefox =
    process.env.TARGET === 'firefox' || env.target === 'firefox';
  const target = isFirefox ? 'firefox' : 'chrome';
  const isWatchMode = argv.watch === true;
  return merge(baseConfig, {
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, `${target}/scripts`),
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: '../options.html',
        minify: false,
        template: 'src/options/options.html',
        chunks: ['options'],
      }),
      new webpack.ProvidePlugin({
        // Make a global `process` variable that points to the `process` package,
        // because the `util` package expects there to be a global variable named `process`.
        // Thanks to https://stackoverflow.com/a/65018686/14239942
        process: 'process/browser',
      }),
      new webpack.DefinePlugin({
        'process.env.DEBUG': JSON.stringify(isWatchMode),
        'process.env.BROWSER_TARGET': JSON.stringify(target),
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'icons'),
            to: path.resolve(__dirname, `${target}/images`),
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
  });
};
