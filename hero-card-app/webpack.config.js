const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '//localhost:8084/',
    library: 'hero-card-app',
    libraryTarget: 'umd',
    chunkLoadingGlobal: 'webpackJsonp_hero_card_app',
    globalObject: 'window',
    clean: true
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  devServer: {
    port: 8084,
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, 'public')
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      scriptLoading: 'blocking'
    })
  ]
};
