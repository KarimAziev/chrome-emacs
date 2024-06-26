'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/**
 * @param {object} env
 * @param {object} argv
 * @returns {import('webpack').Configuration}
 */
module.exports = (_env, argv) => {
  const isWatchMode = argv.watch === true;

  return {
    entry: {
      'service-worker': ['./src/service-worker.ts'],
      'content-script': ['./src/content-script.ts'],
      'query-edit': ['./src/query-edit.ts'],
      injected: ['./src/injected.ts'],
      options: ['./src/options/options.ts'],
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'app/scripts'),
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
      }),
    ],
  };
};
