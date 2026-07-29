const crypto = require('crypto');
const https = require('https');

function createSignHeaders(method, pathname) {
  const secret = process.env.T2S_SIGN_SECRET || '';
  if (!secret) {
    throw new Error('Missing T2S_SIGN_SECRET');
  }
  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(8).toString('hex');
  const signSource = `${String(method || 'GET').toUpperCase()}\n${pathname}\n${ts}\n${nonce}\n`;
  return {
    'X-Sign-Time': ts,
    'X-Sign-Nonce': nonce,
    'X-Sign': crypto.createHmac('sha256', secret).update(signSource, 'utf8').digest('hex')
  };
}

function getForwardPath(event, functionName) {
  const path = String(event.path || '');
  return path
    .replace(new RegExp(`^/\\.netlify/functions/${functionName}/?`), '')
    .replace(new RegExp(`^/${functionName}/?`), '')
    .replace(new RegExp(`^/${functionName.replace(/-api$/, '')}-api/?`), '')
    .replace(/^\/+/, '');
}

async function proxyT2s(event, basePath, functionName) {
  const forwardPath = getForwardPath(event, functionName);
  const incomingUrl = new URL(event.rawUrl || `https://local${event.path || ''}`);
  const upstreamUrl = new URL('https://t2s.awzh.cn');
  upstreamUrl.pathname = `${basePath}/${forwardPath}`.replace(/\/+/g, '/');
  upstreamUrl.search = incomingUrl.search;

  let headers;
  try {
    headers = {
      Accept: event.headers?.accept || 'application/json, text/plain, */*',
      ...createSignHeaders(event.httpMethod, upstreamUrl.pathname)
    };
  } catch {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ message: 'Missing T2S_SIGN_SECRET.' })
    };
  }

  return new Promise((resolve, reject) => {
    const body = ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : event.body;
    const request = https.request({
      method: event.httpMethod || 'GET',
      hostname: upstreamUrl.hostname,
      path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
      headers: {
        ...headers,
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        text += chunk;
      });
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: {
            'content-type': response.headers['content-type'] || 'application/json; charset=utf-8',
            'cache-control': 'no-store'
          },
          body: text
        });
      });
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

module.exports = { proxyT2s };
