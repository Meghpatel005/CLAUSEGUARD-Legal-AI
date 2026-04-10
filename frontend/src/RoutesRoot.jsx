import { useSyncExternalStore } from 'react';
import App from './App.jsx';
import LandingPage from './LandingPage.jsx';
import { getPath, subscribePath } from './lib/router';

function usePathname() {
  return useSyncExternalStore(subscribePath, getPath, getPath);
}

export default function RoutesRoot() {
  const path = usePathname();
  const normalized = path.replace(/\/+$/, '') || '/';

  if (normalized === '/app') {
    return <App />;
  }

  return <LandingPage />;
}
