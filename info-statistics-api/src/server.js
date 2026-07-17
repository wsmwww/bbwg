const http = require('http');
const { randomUUID } = require('crypto');
const { URL } = require('url');
const {
  listRegistrations,
  replaceRegistrations,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  clearRegistrations
} = require('./repositories/jsonRegistrationRepository');

const PORT = Number(process.env.PORT || 8090);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload is too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeRegistration(input = {}) {
  const now = new Date().toISOString();
  return {
    id: String(input.id || randomUUID()),
    name: String(input.name || '').trim(),
    onlineTime: String(input.onlineTime || '').trim(),
    voice: String(input.voice || '可语音').trim(),
    diamonds: Number(input.diamonds || 0),
    willingCost: String(input.willingCost || '愿意').trim(),
    castleLevel: input.castleLevel === '' || input.castleLevel == null ? '' : Number(input.castleLevel),
    troops: Number(input.troops || 0),
    preference: String(input.preference || '').trim(),
    gordonDefenseLevel: input.gordonDefenseLevel === '' || input.gordonDefenseLevel == null ? '' : Number(input.gordonDefenseLevel),
    qinkeRallyLevel: input.qinkeRallyLevel === '' || input.qinkeRallyLevel == null ? '' : Number(input.qinkeRallyLevel),
    remark: String(input.remark || '').trim(),
    createdAt: input.createdAt || now,
    updatedAt: now
  };
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'info-statistics-api' });
    return;
  }

  if (pathname === '/api/info-registrations') {
    if (req.method === 'GET') {
      sendJson(res, 200, { data: await listRegistrations() });
      return;
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const record = normalizeRegistration(body);
      if (!record.name) {
        sendJson(res, 400, { message: 'name is required' });
        return;
      }
      sendJson(res, 201, { data: await createRegistration(record) });
      return;
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const items = Array.isArray(body) ? body : body.data;
      if (!Array.isArray(items)) {
        sendJson(res, 400, { message: 'data must be an array' });
        return;
      }
      const records = items.filter(Boolean).map(normalizeRegistration);
      sendJson(res, 200, { data: await replaceRegistrations(records) });
      return;
    }

    if (req.method === 'DELETE') {
      await clearRegistrations();
      sendJson(res, 200, { data: [] });
      return;
    }
  }

  const itemMatch = pathname.match(/^\/api\/info-registrations\/([^/]+)$/);
  if (itemMatch) {
    const id = decodeURIComponent(itemMatch[1]);

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      const record = normalizeRegistration({ ...body, id });
      if (!record.name) {
        sendJson(res, 400, { message: 'name is required' });
        return;
      }
      const updated = await updateRegistration(id, record);
      if (!updated) {
        sendJson(res, 404, { message: 'registration not found' });
        return;
      }
      sendJson(res, 200, { data: updated });
      return;
    }

    if (req.method === 'DELETE') {
      const deleted = await deleteRegistration(id);
      if (!deleted) {
        sendJson(res, 404, { message: 'registration not found' });
        return;
      }
      sendJson(res, 200, { data: deleted });
      return;
    }
  }

  sendJson(res, 404, { message: 'not found' });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error(error);
    sendJson(res, error.message === 'Invalid JSON body' ? 400 : 500, {
      message: error.message || 'internal server error'
    });
  });
});

server.listen(PORT, () => {
  console.log(`info-statistics-api listening on http://localhost:${PORT}`);
});
