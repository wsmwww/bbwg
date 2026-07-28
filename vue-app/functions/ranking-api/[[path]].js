import { proxyRequest } from '../_lib/proxy.js';

export function onRequest(context) {
  return proxyRequest(context, 'https://t2s.awzh.cn', '/api/ranking');
}
