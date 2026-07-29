const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const T2S_SIGN_SECRET = process.env.T2S_SIGN_SECRET || '';

function createT2sSignHeaders(method, pathName) {
  if (!T2S_SIGN_SECRET) {
    throw new Error('Missing T2S_SIGN_SECRET. Please set it in your local environment before starting dev server.');
  }
  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(8).toString('hex');
  const signSource = `${String(method || 'GET').toUpperCase()}\n${pathName}\n${ts}\n${nonce}\n`;
  const sign = crypto.createHmac('sha256', T2S_SIGN_SECRET).update(signSource, 'utf8').digest('hex');
  return {
    'X-Sign-Time': ts,
    'X-Sign-Nonce': nonce,
    'X-Sign': sign
  };
}

function signT2sProxyRequest(proxyReq, req) {
  const pathName = String(proxyReq.path || req.url || '').split('?')[0];
  const headers = createT2sSignHeaders(req.method, pathName);
  Object.entries(headers).forEach(([key, value]) => proxyReq.setHeader(key, value));
}

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
      '/ranking-api': {
        target: 'https://t2s.awzh.cn',
        changeOrigin: true,
        secure: true,
        pathRewrite: { '^/ranking-api': '/api/ranking' },
        onProxyReq: signT2sProxyRequest
      },
      '/auth-api': {
        target: 'https://t2s.awzh.cn',
        changeOrigin: true,
        secure: true,
        pathRewrite: { '^/auth-api': '/api/auth' },
        onProxyReq: signT2sProxyRequest
      },
      '/legacy-ranking-api': {
        target: 'https://benbenkshen.cn',
        changeOrigin: true,
        secure: true,
        pathRewrite: { '^/legacy-ranking-api': '/data' }
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
