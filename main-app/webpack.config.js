const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
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
              '/ranking-api/*  /.netlify/functions/ranking-api/:splat  200!\n' +
              '/auth-api/*  /.netlify/functions/auth-api/:splat  200!\n' +
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
