import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './auth/AuthContext.jsx';
import RoutesRoot from './RoutesRoot.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RoutesRoot />
    </AuthProvider>
  </React.StrictMode>
);
