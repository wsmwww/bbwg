const { config } = require('../config/env');
const https = require('https');

function toDatabaseRecord(record = {}) {
  return {
    id: record.id,
    name: record.name,
    online_time: record.onlineTime || '',
    voice: record.voice || '',
    diamonds: Number(record.diamonds || 0),
    willing_cost: record.willingCost || '',
    castle_level: record.castleLevel === '' || record.castleLevel == null ? null : Number(record.castleLevel),
    troops: Number(record.troops || 0),
    preference: record.preference || '',
    gordon_defense_level: record.gordonDefenseLevel === '' || record.gordonDefenseLevel == null ? null : Number(record.gordonDefenseLevel),
    qinke_rally_level: record.qinkeRallyLevel === '' || record.qinkeRallyLevel == null ? null : Number(record.qinkeRallyLevel),
    remark: record.remark || '',
    created_at: record.createdAt,
    updated_at: record.updatedAt
  };
}

function fromDatabaseRecord(row = {}) {
  return {
    id: row.id,
    name: row.name || '',
    onlineTime: row.online_time || '',
    voice: row.voice || '',
    diamonds: row.diamonds ?? 0,
    willingCost: row.willing_cost || '',
    castleLevel: row.castle_level ?? '',
    troops: row.troops ?? 0,
    preference: row.preference || '',
    gordonDefenseLevel: row.gordon_defense_level ?? '',
    qinkeRallyLevel: row.qinke_rally_level ?? '',
    remark: row.remark || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getHeaders(extra = {}) {
  return {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

function getEndpoint(path = '') {
  const base = config.supabaseUrl.replace(/\/+$/, '');
  return `${base}/rest/v1/${config.supabaseTable}${path}`;
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const endpoint = new URL(getEndpoint(path));
    const body = options.body || '';
    const headers = getHeaders({
      ...(options.headers || {}),
      ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
    });

    const req = https.request({
      method: options.method || 'GET',
      hostname: endpoint.hostname,
      path: `${endpoint.pathname}${endpoint.search}`,
      headers
    }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        text += chunk;
      });
      response.on('end', () => {
        let payload = null;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch (error) {
          reject(error);
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const message = payload?.message || payload?.hint || `Supabase request failed: ${response.statusCode}`;
          reject(new Error(message));
          return;
        }
        resolve(payload);
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function listRegistrations() {
  const rows = await request('?select=*&order=created_at.desc', { method: 'GET' });
  return Array.isArray(rows) ? rows.map(fromDatabaseRecord) : [];
}

async function replaceRegistrations(items) {
  await clearRegistrations();
  if (!items.length) return [];
  const rows = await request('', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(items.map(toDatabaseRecord))
  });
  return Array.isArray(rows) ? rows.map(fromDatabaseRecord) : [];
}

async function createRegistration(record) {
  const rows = await request('', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(toDatabaseRecord(record))
  });
  return fromDatabaseRecord(rows?.[0] || record);
}

async function updateRegistration(id, record) {
  const rows = await request(`?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(toDatabaseRecord(record))
  });
  return rows?.[0] ? fromDatabaseRecord(rows[0]) : null;
}

async function deleteRegistration(id) {
  const rows = await request(`?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' }
  });
  return rows?.[0] ? fromDatabaseRecord(rows[0]) : null;
}

async function clearRegistrations() {
  const current = await listRegistrations();
  for (const item of current) {
    await deleteRegistration(item.id);
  }
  return [];
}

module.exports = {
  listRegistrations,
  replaceRegistrations,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  clearRegistrations
};
