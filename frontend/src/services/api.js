/**
 * api.js — ClauseGuard AI HTTP client (HttpOnly cookie auth).
 */

import axios from 'axios';
import { navigate } from '../lib/router.js';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 120_000,
  withCredentials: true,
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const detail = err.response?.data?.detail ?? err.message ?? 'An unexpected error occurred.';
    const detailText = typeof detail === 'string' ? detail : JSON.stringify(detail);

    if (
      status === 401 &&
      (detailText.toLowerCase().includes('token') ||
        detailText.toLowerCase().includes('not authenticated'))
    ) {
      const onApp = typeof window !== 'undefined' && window.location.pathname.startsWith('/app');
      if (onApp && !window.location.pathname.startsWith('/login')) {
        navigate('/login?session=expired');
      }
    }

    if (status === 429) {
      return Promise.reject(new Error('Too many requests. Please wait a moment and try again.'));
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
  return data;
}

export async function login(email, password) {
  const { data } = await http.post('/api/auth/login', { email, password });
  return data;
}

export async function logout() {
  await http.post('/api/auth/logout');
}

export async function getMe() {
  const { data } = await http.get('/api/auth/me');
  return data;
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

export async function startAnalysis(documentId) {
  const { data } = await http.post(`/api/documents/${documentId}/analyze`);
  return data;
}

/** @deprecated use startAnalysis + waitForAnalysis */
export async function analyzeDocument(documentId) {
  const queued = await startAnalysis(documentId);
  if (queued.analysis) return queued.analysis;
  if (queued.status === 'processing' || !queued.analysis) {
    return waitForAnalysis(documentId);
  }
  return queued;
}

export async function waitForAnalysis(
  documentId,
  { onStatus, intervalMs = 2500, maxWaitMs = 600_000 } = {}
) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const doc = await getDocument(documentId);
    onStatus?.(doc);

    if (doc.is_analyzed && doc.analysis) {
      return doc.analysis;
    }
    const st = doc.analysis_status ?? doc.status;
    if (st === 'failed') {
      throw new Error(doc.analysis_error || 'Analysis failed.');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Analysis is taking longer than expected. Check back in your document list.');
}

export async function getDocument(documentId) {
  const { data } = await http.get(`/api/documents/${documentId}`);
  return data;
}

export async function deleteDocument(documentId) {
  const { data } = await http.delete(`/api/documents/${documentId}`);
  return data;
}

export async function downloadAnnotatedPDF(documentId) {
  const { data, headers } = await http.get(`/api/documents/${documentId}/annotated`, {
    responseType: 'blob',
  });

  let filename = `annotated_document_${documentId}.pdf`;
  const disposition = headers['content-disposition'];
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
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
