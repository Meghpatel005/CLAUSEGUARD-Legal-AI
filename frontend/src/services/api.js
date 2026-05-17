/**
 * api.js — ClauseGuard AI HTTP client (JWT-authenticated).
 */

import axios from 'axios';
import { navigate } from '../lib/router.js';

const TOKEN_KEY = 'clauseguard_access_token';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 120_000,
});

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

http.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const detail = err.response?.data?.detail ?? err.message ?? 'An unexpected error occurred.';
    const detailText = typeof detail === 'string' ? detail : JSON.stringify(detail);

    // Stale token (e.g. after JWT_SECRET_KEY change or server restart) — force re-login
    if (
      status === 401 &&
      (detailText.toLowerCase().includes('token') ||
        detailText.toLowerCase().includes('not authenticated'))
    ) {
      setStoredToken(null);
      const onApp = typeof window !== 'undefined' && window.location.pathname.startsWith('/app');
      if (onApp && !window.location.pathname.startsWith('/login')) {
        navigate('/login?session=expired');
      }
    }

    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg ?? JSON.stringify(d)).join('; ')
          : JSON.stringify(detail);
    return Promise.reject(new Error(message));
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────

export async function signup(name, email, password) {
  const { data } = await http.post('/api/auth/signup', { name, email, password });
  setStoredToken(data.access_token);
  return data;
}

export async function login(email, password) {
  const { data } = await http.post('/api/auth/login', { email, password });
  setStoredToken(data.access_token);
  return data;
}

export async function getMe() {
  const { data } = await http.get('/api/auth/me');
  return data;
}

export function logout() {
  setStoredToken(null);
}

// ── Documents ──────────────────────────────────────────────────────────────

export async function uploadDocument(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post('/api/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listDocuments() {
  const { data } = await http.get('/api/documents');
  return data;
}

export async function analyzeDocument(documentId) {
  const { data } = await http.post(`/api/documents/${documentId}/analyze`);
  return data;
}

export async function getDocument(documentId) {
  const { data } = await http.get(`/api/documents/${documentId}`);
  return data;
}

export async function deleteDocument(documentId) {
  const { data } = await http.delete(`/api/documents/${documentId}`);
  return data;
}

// ── Chat ───────────────────────────────────────────────────────────────────

export async function sendChatMessage(documentId, message, history = []) {
  const { data } = await http.post('/api/chat', {
    document_id: documentId,
    message,
    history,
  });
  return data;
}

export async function getChatHistory(documentId) {
  const { data } = await http.get(`/api/chat/${documentId}`);
  return data;
}

export async function listChatThreads() {
  const { data } = await http.get('/api/chat');
  return data;
}
