import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import ClientesPage from './pages/ClientesPage';
import SolicitudesPage from './pages/SolicitudesPage';
import EvaluacionPage from './pages/EvaluacionPage';
import CreditosPage from './pages/CreditosPage';
import PagosPage from './pages/PagosPage';
import ReportesPage from './pages/ReportesPage';
import UsuariosPage from './pages/UsuariosPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas dentro del Layout general */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route
                    path="clientes"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'OFICIAL']}>
                        <ClientesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="solicitudes"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'OFICIAL']}>
                        <SolicitudesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="evaluacion"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'ANALISTA']}>
                        <EvaluacionPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="creditos"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'JEFE', 'OFICIAL']}>
                        <CreditosPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="pagos"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'CAJERO']}>
                        <PagosPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="reportes"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'GERENTE']}>
                        <ReportesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="usuarios"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN']}>
                        <UsuariosPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Redirección por defecto */}
                  <Route path="*" element={<Navigate to="/solicitudes" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}