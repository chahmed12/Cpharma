import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ConsultationProvider } from './context/ConsultationContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>             {/* ① Auth — JWT, rôle, user */}
      <SocketProvider>           {/* ② WS — file d'attente + signaling */}
        <ConsultationProvider>     {/* ③ État consultation courante */}
          <App />
        </ConsultationProvider>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);