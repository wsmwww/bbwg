import { proxyRequest } from '../_lib/proxy.js';

export async function onRequest(context) {
  return proxyRequest(context, 'https://t2s.awzh.cn', '/api/auth');
}
