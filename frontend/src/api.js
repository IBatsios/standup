const BASE = '/api';
let token = localStorage.getItem('standup_token');

function setToken(t) { token = t; if (t) localStorage.setItem('standup_token', t); else localStorage.removeItem('standup_token'); }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    if (res.status === 401 && path !== '/auth/login') { setToken(null); window.location.reload(); }
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function login(id, password) { const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ id, password }) }); setToken(data.token); return data.user; }
export async function getMe() { if (!token) return null; try { return await request('/auth/me'); } catch { return null; } }
export function logout() { setToken(null); }
export function isLoggedIn() { return !!token; }

export const getUsers = () => request('/users');
export const createUser = (data) => request('/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (id) => request(`/users/${id}`, { method: 'DELETE' });

export const getTeams = () => request('/teams');
export const getLedTeams = () => request('/teams/led-by-me');
export const createTeam = (data) => request('/teams', { method: 'POST', body: JSON.stringify(data) });
export const updateTeam = (id, data) => request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTeam = (id) => request(`/teams/${id}`, { method: 'DELETE' });

export const getTeammates = () => request('/users/teammates');

export const getClients = () => request('/clients');
export const createClient = (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) });
export const updateClient = (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClient = (id) => request(`/clients/${id}`, { method: 'DELETE' });

export const getTasks = (userId, date) => request(`/tasks/${userId}${date ? `?date=${date}` : ''}`);
export const createTask = (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' });
export const handoffTask = (id, data) => request(`/tasks/${id}/handoff`, { method: 'POST', body: JSON.stringify(data) });
export const getTaskHistory = (id) => request(`/tasks/${id}/history`);

export const healthCheck = () => request('/health');
