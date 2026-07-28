function buildUpstreamUrl(requestUrl, origin, basePath, path) {
  const incomingUrl = new URL(requestUrl);
  const upstreamUrl = new URL(origin);
  const normalizedPath = Array.isArray(path) ? path.join('/') : String(path || '');

  upstreamUrl.pathname = `${basePath}/${normalizedPath}`.replace(/\/+/g, '/');
  upstreamUrl.search = incomingUrl.search;
  return upstreamUrl;
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
