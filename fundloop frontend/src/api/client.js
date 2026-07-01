/**
 * FundLoop API Client
 * Set VITE_API_BASE_URL in your .env  (default: http://localhost:3000/api)
 */
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('fl_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('fl_token');
    localStorage.removeItem('fl_user');
    window.dispatchEvent(new Event('fl_unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`);
  return data;
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
};

/* ── Auth ──────────────────────────────────────────── */
export const authApi = {
  login:          (creds)  => api.post('/auth/login',           creds),
  logout:         ()       => api.post('/auth/logout'),
  me:             ()       => api.get('/auth/me'),
  register:       (data)   => api.post('/auth/register',        data),
  forgotPassword: (email)  => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data)   => api.post('/auth/reset-password',  data),
  changePassword: (data)   => api.put('/auth/password',         data),
  updateProfile:  (data)   => api.put('/auth/profile',          data),
};

/* ── Dashboard ─────────────────────────────────────── */
export const dashboardApi = {
  adminOverview:  (chamaId) => api.get(`/chamas/${chamaId}/dashboard`),
  memberOverview: (chamaId) => api.get(`/chamas/${chamaId}/member-dashboard`),
};

/* ── Chamas ────────────────────────────────────────── */
export const chamaApi = {
  list:   ()           => api.get('/chamas'),
  get:    (id)         => api.get(`/chamas/${id}`),
  create: (data)       => api.post('/chamas',     data),
  update: (id, data)   => api.put(`/chamas/${id}`, data),
  delete: (id)         => api.delete(`/chamas/${id}`),
  switch: (id)         => api.post(`/chamas/${id}/switch`),
};

/* ── Members ───────────────────────────────────────── */
export const membersApi = {
  list:    (cid)        => api.get(`/chamas/${cid}/members`),
  get:     (cid, id)   => api.get(`/chamas/${cid}/members/${id}`),
  invite:  (cid, data) => api.post(`/chamas/${cid}/members/invite`, data),
  approve: (cid, id)   => api.patch(`/chamas/${cid}/members/${id}/approve`),
  suspend: (cid, id)   => api.patch(`/chamas/${cid}/members/${id}/suspend`),
  remove:  (cid, id)   => api.delete(`/chamas/${cid}/members/${id}`),
};

/* ── Transactions ──────────────────────────────────── */
export const transactionsApi = {
  list: (cid, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/chamas/${cid}/transactions${q ? `?${q}` : ''}`);
  },
  get:    (cid, id)          => api.get(`/chamas/${cid}/transactions/${id}`),
  topUp:  (cid, data)        => api.post(`/chamas/${cid}/transactions/topup`,    data),
  withdraw:(cid, data)       => api.post(`/chamas/${cid}/transactions/withdraw`,  data),
  transfer:(cid, data)       => api.post(`/chamas/${cid}/transactions/transfer`,  data),
  reverse: (cid, id, data)   => api.post(`/chamas/${cid}/transactions/${id}/reverse`, data),
  export: (cid, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/chamas/${cid}/transactions/export${q ? `?${q}` : ''}`);
  },
};

/* ── ROSCA ─────────────────────────────────────────── */
export const roscaApi = {
  list:        (cid)           => api.get(`/chamas/${cid}/rosca`),
  getCycle:    (cid, id)       => api.get(`/chamas/${cid}/rosca/${id}`),
  createCycle: (cid, data)     => api.post(`/chamas/${cid}/rosca`,                data),
  contribute:  (cid, id, data) => api.post(`/chamas/${cid}/rosca/${id}/contribute`,data),
  payout:      (cid, id, data) => api.post(`/chamas/${cid}/rosca/${id}/payout`,    data),
  members:     (cid, id)       => api.get(`/chamas/${cid}/rosca/${id}/members`),
  addMember:   (cid, id, data) => api.post(`/chamas/${cid}/rosca/${id}/members`,   data),
};

/* ── Welfare ───────────────────────────────────────── */
export const welfareApi = {
  claims:       (cid)            => api.get(`/chamas/${cid}/welfare/claims`),
  getClaim:     (cid, id)        => api.get(`/chamas/${cid}/welfare/claims/${id}`),
  submit:       (cid, data)      => api.post(`/chamas/${cid}/welfare/claims`,           data),
  vote:         (cid, id, data)  => api.post(`/chamas/${cid}/welfare/claims/${id}/vote`, data),
  approve:      (cid, id)        => api.patch(`/chamas/${cid}/welfare/claims/${id}/approve`),
  reject:       (cid, id, data)  => api.patch(`/chamas/${cid}/welfare/claims/${id}/reject`, data),
  balance:      (cid)            => api.get(`/chamas/${cid}/welfare/balance`),
  contribute:   (cid, data)      => api.post(`/chamas/${cid}/welfare/contribute`, data),
};

/* ── Governance ────────────────────────────────────── */
export const governanceApi = {
  proposals:   (cid)           => api.get(`/chamas/${cid}/governance/proposals`),
  getProposal: (cid, id)       => api.get(`/chamas/${cid}/governance/proposals/${id}`),
  create:      (cid, data)     => api.post(`/chamas/${cid}/governance/proposals`,          data),
  vote:        (cid, id, data) => api.post(`/chamas/${cid}/governance/proposals/${id}/vote`,data),
  close:       (cid, id)       => api.patch(`/chamas/${cid}/governance/proposals/${id}/close`),
  meetings:    (cid)           => api.get(`/chamas/${cid}/governance/meetings`),
  createMeeting:(cid, data)    => api.post(`/chamas/${cid}/governance/meetings`,            data),
};

/* ── Settings ──────────────────────────────────────── */
export const settingsApi = {
  get:    (cid)       => api.get(`/chamas/${cid}/settings`),
  update: (cid, data) => api.put(`/chamas/${cid}/settings`, data),
};

/* ── Reports ───────────────────────────────────────── */
export const reportsApi = {
  financial: (cid, period) => api.get(`/chamas/${cid}/reports/financial?period=${period}`),
  members:   (cid)         => api.get(`/chamas/${cid}/reports/members`),
};
