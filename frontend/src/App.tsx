import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { NacionalPage } from './pages/NacionalPage';
import { IntendenciaPage } from './pages/IntendenciaPage';
import { CscTableroPage } from './pages/CscTableroPage';

// Componente para proteger rutas o permitir acceso invitado
const RutaProtegida: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontWeight: 600,
        }}
      >
        Iniciando SITRA...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/nacional"
            element={
              <RutaProtegida>
                <NacionalPage />
              </RutaProtegida>
            }
          />

          <Route
            path="/comparativo"
            element={<Navigate to="/nacional" replace />}
          />

          <Route
            path="/intendencia/:codigo"
            element={
              <RutaProtegida>
                <IntendenciaPage />
              </RutaProtegida>
            }
          />

          <Route
            path="/sede/:codigo"
            element={
              <RutaProtegida>
                <CscTableroPage />
              </RutaProtegida>
            }
          />

          <Route
            path="/tv/:codigo"
            element={
              <RutaProtegida>
                <CscTableroPage />
              </RutaProtegida>
            }
          />

          <Route path="/" element={<Navigate to="/nacional" replace />} />
          <Route path="*" element={<Navigate to="/nacional" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
