/**
 * api.js — ClauseVerifyer AI HTTP client
 *
 * All field names mirror the FastAPI response shapes exactly.
 * The Vite proxy forwards /api/* → http://localhost:8000, so no
 * base-URL configuration is needed in development.
 */

import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 120_000,
});

// ── Response interceptor: normalise error messages ─────────────────────────
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail =
      err.response?.data?.detail ??
      err.message ??
      'An unexpected error occurred.';
    return Promise.reject(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)));
  }
);

// ── Document endpoints ─────────────────────────────────────────────────────

/**
 * Upload a PDF file.
 * @param {File} file
 * @returns {{ document_id, filename, page_count, word_count, upload_time }}
 */
export async function uploadDocument(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await http.post('/api/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Trigger LLM analysis for an already-uploaded document.
 * @param {string} documentId
 * @returns {AnalysisResponse}
 */
export async function analyzeDocument(documentId) {
  const { data } = await http.post(`/api/documents/${documentId}/analyze`);
  return data;
}

/**
 * Retrieve document metadata (and cached analysis if available).
 * @param {string} documentId
 */
export async function getDocument(documentId) {
  const { data } = await http.get(`/api/documents/${documentId}`);
  return data;
}

// ── Chat endpoint ──────────────────────────────────────────────────────────

/**
 * Send a chat message grounded in the uploaded document.
 * @param {string} documentId
 * @param {string} message
 * @param {{ role: string, content: string }[]} history
 * @returns {{ response: string, sources_used: number }}
 */
export async function sendChatMessage(documentId, message, history) {
  const { data } = await http.post('/api/chat', {
    document_id: documentId,
    message,
    history,
  });
  return data;
}

// ── Admin endpoints ─────────────────────────────────────────────────────────

/**
 * Fetch mock users for admin dashboard.
 * @returns {{ id: string, name: string, email: string, role: string }[]}
 */
export async function getAdminUsers() {
  const { data } = await http.get('/api/admin/users');
  return data;
}

/**
 * Fetch all stored document metadata for admin dashboard.
 * @returns {{ total: number, documents: object[] }}
 */
export async function getAdminDocuments() {
  const { data } = await http.get('/api/admin/documents');
  return data;
}

/**
 * Delete a document from the in-memory document store.
 * @param {string} documentId
 */
export async function deleteAdminDocument(documentId) {
  const { data } = await http.delete(`/api/admin/document/${documentId}`);
  return data;
}
