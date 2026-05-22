import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token + Accept-Language ke setiap request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gk_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Kirim bahasa yang dipilih user ke backend agar pesan error ikut bahasa yang sama
    const langStore = localStorage.getItem('gk_lang');
    const lang = langStore ? (JSON.parse(langStore)?.state?.lang ?? 'en') : 'en';
    config.headers['Accept-Language'] = lang;
  }
  return config;
});

// Handle 401 (token expired) → clear semua auth state → redirect ke login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Hapus SEMUA auth state: gk_token (manual) + gk_auth (Zustand persist key)
      // agar saat redirect ke /, Zustand hydrate ulang dengan state kosong
      localStorage.removeItem('gk_token');
      localStorage.removeItem('gk_user');
      localStorage.removeItem('gk_auth'); // ← ini yang bikin loop sebelumnya
      // Hanya redirect jika belum di halaman login
      if (window.location.pathname !== '/') {
        window.location.replace('/');
      }
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
  getAll:        (params?: object) => api.get('/items', { params }),
  getById:       (id: string)      => api.get(`/items/${id}`),
  create:        (data: object)    => api.post('/items', data),
  update:        (id: string, data: object) => api.put(`/items/${id}`, data),
  delete:        (id: string)      => api.delete(`/items/${id}`),
  getCategories: () => api.get('/items/categories'),
  getUnits:      () => api.get('/items/units'),
};


// ── Warehouses ──────────────────────────────────────────────
export const warehousesApi = {
  // Read
  getAll:     (params?: object)  => api.get('/warehouses', { params }),
  getById:    (id: string)       => api.get(`/warehouses/${id}`),
  getStock:   (id: string, params?: object) => api.get(`/warehouses/${id}/stock`, { params }),

  // Regions CRUD
  getRegions:    ()                      => api.get('/warehouses/regions'),
  createRegion:  (data: object)          => api.post('/warehouses/regions', data),
  updateRegion:  (id: string, data: object) => api.put(`/warehouses/regions/${id}`, data),
  deleteRegion:  (id: string)            => api.delete(`/warehouses/regions/${id}`),

  // Cities CRUD
  getCities:     (params?: object)       => api.get('/warehouses/cities', { params }),
  createCity:    (data: object)          => api.post('/warehouses/cities', data),
  updateCity:    (id: string, data: object) => api.put(`/warehouses/cities/${id}`, data),
  deleteCity:    (id: string)            => api.delete(`/warehouses/cities/${id}`),

  // Warehouses CRUD
  create:        (data: object)          => api.post('/warehouses', data),
  update:        (id: string, data: object) => api.put(`/warehouses/${id}`, data),
  delete:        (id: string)            => api.delete(`/warehouses/${id}`),
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

