const API_BASE =
  window.__INFO_STATISTICS_API_BASE__ ||
  localStorage.getItem('benben-info-statistics-api-base') ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8090'
    : `${window.location.origin}/info-api`);

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.message || `Request failed: ${response.status}`);
  }
  return payload.data ?? payload;
}

export function getInfoRegistrations() {
  return request('/api/info-registrations');
}

export function createInfoRegistration(data) {
  return request('/api/info-registrations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function updateInfoRegistration(id, data) {
  return request(`/api/info-registrations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export function deleteInfoRegistration(id) {
  return request(`/api/info-registrations/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export function replaceInfoRegistrations(data) {
  return request('/api/info-registrations', {
    method: 'PUT',
    body: JSON.stringify({ data })
  });
}

export function clearInfoRegistrations() {
  return request('/api/info-registrations', {
    method: 'DELETE'
  });
}

export { API_BASE as INFO_STATISTICS_API_BASE };
