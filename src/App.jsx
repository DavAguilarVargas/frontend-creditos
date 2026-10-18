import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import ClientesPage from './pages/ClientesPage';
import SolicitudesPage from './pages/SolicitudesPage';
import GarantiasPage from './pages/GarantiasPage';
import EvaluacionPage from './pages/EvaluacionPage';
import CreditosPage from './pages/CreditosPage';
import PagosPage from './pages/PagosPage';
import ReportesPage from './pages/ReportesPage';
import UsuariosPage from './pages/UsuariosPage';
import DesembolsosPage from './pages/DesembolsosPage';
import AprobacionesPage from './pages/AprobacionesPage';
import AuditoriaPage from './pages/AuditoriaPage';
import ConfiguracionInstitucionPage from './pages/ConfiguracionInstitucionPage';
import { ConfiguracionInstitucionProvider } from './context/ConfiguracionInstitucionContext';
export default function App() {
  return (
    <AuthProvider>
      <ConfiguracionInstitucionProvider>
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
                  {/* CU01 / RF02: Clientes */}
                  <Route
                    path="clientes"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'OFICIAL']}>
                        <ClientesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* CU02: Solicitudes */}
                  <Route
                    path="solicitudes"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'OFICIAL']}>
                        <SolicitudesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* CU06: Garantías */}
                  <Route
                    path="garantias"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'OFICIAL']}>
                        <GarantiasPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* CU03 - CU05: Evaluaciones y Riesgo */}
                  <Route
                    path="evaluacion"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'ANALISTA']}>
                        <EvaluacionPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* CU07, CU08, CU11: Aprobación y Créditos / Desembolsos */}
                  <Route
                    path="creditos"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'JEFE', 'OFICIAL']}>
                        <CreditosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* CU12: Cobranza y Pagos */}
                  <Route
                    path="pagos"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'CAJERO', 'CLIENTE']}>
                        <PagosPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* CU14: Reportes Gerenciales */}
                  <Route
                    path="reportes"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN', 'GERENTE']}>
                        <ReportesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* CU15: Administrar Usuarios */}
                  <Route
                    path="usuarios"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN']}>
                        <UsuariosPage />
                      </ProtectedRoute>
                    }
                  />
                    <Route
                      path="desembolsos"
                      element={
                        <ProtectedRoute rolesPermitidos={['ADMIN', 'OFICIAL']}>
                          <DesembolsosPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="aprobaciones"
                      element={
                        <ProtectedRoute rolesPermitidos={['ADMIN', 'JEFE']}>
                          <AprobacionesPage />
                        </ProtectedRoute>
                      }
                    />
                  {/* Configuración de identidad visual y datos contractuales, solo ADMIN */}
                  <Route
                    path="configuracion-institucion"
                    element={
                      <ProtectedRoute rolesPermitidos={['ADMIN']}>
                        <ConfiguracionInstitucionPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                      path="auditoria"
                      element={
                        <ProtectedRoute rolesPermitidos={['ADMIN', 'GERENTE']}>
                          <AuditoriaPage />
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
      </ConfiguracionInstitucionProvider>
    </AuthProvider>
  );
}