const { proxyT2s } = require('./_t2sProxy');

exports.handler = async function handler(event) {
  return proxyT2s(event, '/api/ranking', 'ranking-api');
};
