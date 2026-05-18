/**
 * adminApi.js — Admin-only API calls for ClauseGuard AI.
 */

import axios from 'axios';
import { navigate } from '../lib/router.js';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 30_000,
  withCredentials: true,
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      navigate('/login');
    }
    const detail = err.response?.data?.detail ?? err.message ?? 'Admin request failed.';
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    return Promise.reject(new Error(message));
  }
);

export async function getAdminStats() {
  const { data } = await http.get('/api/admin/stats');
  return data;
}

export async function getAdminUsers() {
  const { data } = await http.get('/api/admin/users');
  return data;
}

export async function deleteAdminUser(userId) {
  const { data } = await http.delete(`/api/admin/users/${userId}`);
  return data;
}

export async function getAdminRecentDocuments() {
  const { data } = await http.get('/api/admin/documents/recent');
  return data;
}

export async function getAdminAllDocuments() {
  const { data } = await http.get('/api/admin/documents');
  return data;
}

export async function deleteAdminDocument(documentId) {
  const { data } = await http.delete(`/api/admin/documents/${documentId}`);
  return data;
}
