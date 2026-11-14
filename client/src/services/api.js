const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('splitsync_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('splitsync_token');
      localStorage.removeItem('splitsync_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const message = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    demo: () => request('/auth/demo', { method: 'POST' }),
    getMe: () => request('/auth/me')
  },

  // Groups
  groups: {
    list: () => request('/groups'),
    get: (groupId) => request(`/groups/${groupId}`),
    create: (data) => request('/groups', { method: 'POST', body: JSON.stringify(data) }),
    update: (groupId, data) => request(`/groups/${groupId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (groupId) => request(`/groups/${groupId}`, { method: 'DELETE' }),
    addMember: (groupId, memberData) => request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(memberData) })
  },

  // Expenses & Settlements
  expenses: {
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (expenseId, data) => request(`/expenses/${expenseId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (expenseId) => request(`/expenses/${expenseId}`, { method: 'DELETE' }),
    settle: (settlementData) => request('/expenses/settle', { method: 'POST', body: JSON.stringify(settlementData) })
  },

  // Analytics
  analytics: {
    get: (groupId) => request(`/analytics/${groupId}`)
  }
};

