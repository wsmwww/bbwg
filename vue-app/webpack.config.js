const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const fs = require('fs');

function copyDirectorySync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from, { withFileTypes: true }).forEach((entry) => {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirectorySync(source, target);
    } else if (entry.isFile()) {
      fs.copyFileSync(source, target);
    }
  });
}

class CopyPublicPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('CopyPublicPlugin', () => {
      const from = path.resolve(__dirname, 'public');
      const to = path.resolve(__dirname, 'dist');
      copyDirectorySync(from, to);
    });
  }
}

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
  entry: './src/main.js',
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: isProduction ? 'auto' : '//localhost:8081/',
    library: 'vueApp',
    libraryTarget: 'window',
    chunkLoadingGlobal: 'webpackJsonp_vue_app',
    globalObject: 'window',
    clean: true
  },
  module: {
    rules: [
      { resourceQuery: /raw/, type: 'asset/source' },
      { test: /\.vue$/, loader: 'vue-loader' },
      { test: /\.(png|jpe?g|gif|webp)$/i, type: 'asset/resource', generator: { filename: 'assets/[name][ext]' } },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  resolve: {
    extensions: ['.js', '.vue']
  },
  devServer: {
    port: 8081,
    historyApiFallback: true,
    static: {
      directory: path.resolve(__dirname, 'public'),
      publicPath: '/'
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    proxy: {
      '/benben-ranking-api': {
        target: 'https://benbenkshen.cn',
        changeOrigin: true,
        secure: true,
        pathRewrite: { '^/benben-ranking-api': '/data' }
      }
    }
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      inject: false,
      scriptLoading: 'blocking'
    }),
    new CopyPublicPlugin()
  ]
  };
};
