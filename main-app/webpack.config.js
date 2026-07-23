const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

class EmitNetlifyRedirectsPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('EmitNetlifyRedirectsPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'EmitNetlifyRedirectsPlugin',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        () => {
          compilation.emitAsset(
            '_redirects',
            new compiler.webpack.sources.RawSource(
              '/ranking-api/*  https://t2s.awzh.cn/api/ranking/:splat  200!\n' +
              '/legacy-ranking-api/*  https://benbenkshen.cn/data/:splat  200!\n'
            )
          );
        }
      );
    });
  }
}

module.exports = {
  entry: './src/index.js',
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  devServer: {
    port: 8080,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    proxy: {
      '/ranking-api': {
        target: 'https://t2s.awzh.cn',
        changeOrigin: true,
        secure: true,
        pathRewrite: { '^/ranking-api': '/api/ranking' }
      },
      '/legacy-ranking-api': {
        target: 'https://benbenkshen.cn',
        changeOrigin: true,
        secure: true,
        pathRewrite: { '^/legacy-ranking-api': '/data' }
      },
      '/info-api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        pathRewrite: { '^/info-api': '' }
      }
    }
  },
  plugins: [
    new EmitNetlifyRedirectsPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ]
};
