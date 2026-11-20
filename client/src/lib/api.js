const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const KEY = 'todo.clientId';

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function clientId() {
  let id = localStorage.getItem(KEY);
  if (!id) { id = uuid(); localStorage.setItem(KEY, id); }
  return id;
}

export const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export class ApiError extends Error {
  constructor(message, status, details) { super(message); this.status = status; this.details = details || {}; }
}

async function call(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'X-Client-Id': clientId(), ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection.', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.details);
  return data;
}

const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString();

export const api = {
  weeks: () => call(`/tasks/weeks?${qs({ tz: timeZone() })}`),
  weekTasks: (week) => call(`/tasks?${qs({ week, tz: timeZone() })}`),
  search: (q, { status, priority, overdue } = {}) => call(`/tasks?${qs({ q, status, priority, overdue: overdue ? 1 : null })}`),
  create: (task) => call('/tasks', { method: 'POST', body: task }),
  update: (id, changes) => call(`/tasks/${id}`, { method: 'PATCH', body: changes }),
  remove: (id) => call(`/tasks/${id}`, { method: 'DELETE' }),
};
