import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token ke setiap request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gk_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (token expired) → redirect ke login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gk_token');
      localStorage.removeItem('gk_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ────────────────────────────────────────────────────
export const authApi = {
  login:          (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe:          () => api.get('/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/change-password', { current_password, new_password }),
};

// ── Items ───────────────────────────────────────────────────
export const itemsApi = {
  getAll:      (params?: object) => api.get('/items', { params }),
  getById:     (id: string)      => api.get(`/items/${id}`),
  create:      (data: object)    => api.post('/items', data),
  update:      (id: string, data: object) => api.put(`/items/${id}`, data),
  getCategories: () => api.get('/items/categories'),
  getUnits:    () => api.get('/items/units'),
};

// ── Warehouses ──────────────────────────────────────────────
export const warehousesApi = {
  getAll:     (params?: object)  => api.get('/warehouses', { params }),
  getById:    (id: string)       => api.get(`/warehouses/${id}`),
  getStock:   (id: string, params?: object) => api.get(`/warehouses/${id}/stock`, { params }),
  getRegions: () => api.get('/warehouses/regions'),
};

// ── Batches ─────────────────────────────────────────────────
export const batchesApi = {
  getAll:       (params?: object) => api.get('/batches', { params }),
  getSummary:   (params?: object) => api.get('/batches/summary', { params }),
  updateStatus: (id: string, data: object) => api.put(`/batches/${id}/status`, data),
};

// ── Receipts ─────────────────────────────────────────────────
export const receiptsApi = {
  getAll:   (params?: object) => api.get('/receipts', { params }),
  getById:  (id: string)      => api.get(`/receipts/${id}`),
  create:   (data: object)    => api.post('/receipts', data),
  confirm:  (id: string, data: object) => api.post(`/receipts/${id}/confirm`, data),
  cancel:   (id: string)      => api.put(`/receipts/${id}/cancel`, {}),
};

// ── Issues ───────────────────────────────────────────────────
export const issuesApi = {
  getAll:   (params?: object) => api.get('/issues', { params }),
  getById:  (id: string)      => api.get(`/issues/${id}`),
  create:   (data: object)    => api.post('/issues', data),
  confirm:  (id: string)      => api.post(`/issues/${id}/confirm`, {}),
  cancel:   (id: string)      => api.put(`/issues/${id}/cancel`, {}),
};

// ── Transfers ────────────────────────────────────────────────
export const transfersApi = {
  getAll:    (params?: object) => api.get('/transfers', { params }),
  getById:   (id: string)      => api.get(`/transfers/${id}`),
  create:    (data: object)    => api.post('/transfers', data),
  dispatch:  (id: string)      => api.post(`/transfers/${id}/dispatch`, {}),
  receive:   (id: string, data?: object) => api.post(`/transfers/${id}/receive`, data || {}),
};

// ── Reports ──────────────────────────────────────────────────
export const reportsApi = {
  dashboard:         (params?: object) => api.get('/reports/dashboard', { params }),
  stockPosition:     (params?: object) => api.get('/reports/stock-position', { params }),
  expiryReport:      (params?: object) => api.get('/reports/expiry', { params }),
  stockCard:         (params?: object) => api.get('/reports/stock-card', { params }),
  getExportSettings: () => api.get('/reports/export-settings'),
  updateExportPath:  (export_path: string) => api.put('/reports/export-settings', { export_path }),
  openFolder:        (folder_path?: string) => api.post('/reports/open-folder', { folder_path }),
};



// ── Users (admin) ─────────────────────────────────────────────
export const usersApi = {
  list:          () => api.get('/users'),
  getRoles:      () => api.get('/users/roles'),
  create:        (data: { name: string; email: string; password: string; role_ids: string[] }) =>
    api.post('/users', data),
  update:        (id: string, data: { name?: string; is_active?: boolean; role_ids?: string[] }) =>
    api.put(`/users/${id}`, data),
  resetPassword: (id: string, new_password: string) =>
    api.put(`/users/${id}/reset-password`, { new_password }),
};

