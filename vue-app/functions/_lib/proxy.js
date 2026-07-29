function buildUpstreamUrl(requestUrl, origin, basePath, path) {
  const incomingUrl = new URL(requestUrl);
  const upstreamUrl = new URL(origin);
  const normalizedPath = Array.isArray(path) ? path.join('/') : String(path || '');

  upstreamUrl.pathname = `${basePath}/${normalizedPath}`.replace(/\/+/g, '/');
  upstreamUrl.search = incomingUrl.search;
  return upstreamUrl;
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key, data) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return bytesToHex(signature);
}

async function getT2sSignHeaders(method, upstreamUrl, env = {}) {
  const secret = env.T2S_SIGN_SECRET || '';
  if (!secret) {
    throw new Error('Missing T2S_SIGN_SECRET');
  }
  const ts = String(Math.floor(Date.now() / 1000));
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const nonce = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const signSource = `${String(method || 'GET').toUpperCase()}\n${upstreamUrl.pathname}\n${ts}\n${nonce}\n`;
  return {
    'X-Sign-Time': ts,
    'X-Sign-Nonce': nonce,
    'X-Sign': await hmacSha256(secret, signSource)
  };
}

export async function proxyRequest(context, origin, basePath) {
  const upstreamUrl = buildUpstreamUrl(
    context.request.url,
    origin,
    basePath,
    context.params.path
  );
  const headers = new Headers(context.request.headers);
  headers.delete('host');
  if (origin.includes('t2s.awzh.cn')) {
    try {
      const signHeaders = await getT2sSignHeaders(context.request.method, upstreamUrl, context.env);
      Object.entries(signHeaders).forEach(([key, value]) => headers.set(key, value));
    } catch {
      return Response.json({ message: 'Missing T2S_SIGN_SECRET.' }, { status: 500 });
    }
  }

  try {
    return await fetch(upstreamUrl, {
      method: context.request.method,
      headers,
      body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
      redirect: 'follow'
    });
  } catch {
    return Response.json({ message: 'Upstream API request failed.' }, { status: 502 });
  }
}
