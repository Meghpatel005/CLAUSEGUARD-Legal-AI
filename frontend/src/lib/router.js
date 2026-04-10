/**
 * Minimal SPA path helper. Keeps pathname in sync with history.
 */

let path = typeof window !== 'undefined' ? window.location.pathname : '/';
const listeners = new Set();

function emit() {
  if (typeof window === 'undefined') return;
  path = window.location.pathname;
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit);
}

export function subscribePath(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPath() {
  return path;
}

/** @param {string} to Path and optional query */
export function navigate(to) {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', to);
  emit();
}
