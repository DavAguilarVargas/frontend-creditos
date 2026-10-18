import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfiguracionInstitucion } from '../context/ConfiguracionInstitucionContext';
import { 
  Users, FileText, ShieldCheck, Banknote, 
  UserCheck, History, CheckCircle2, DollarSign, 
  BarChart3, UserCog, Building2, Menu, X, LogOut,
  FolderOpen, Settings
} from 'lucide-react';

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const { configuracion } = useConfiguracionInstitucion();
  const colorPrimario = configuracion.color_primario || '#0F172A';
  const colorSecundario = configuracion.color_secundario || '#0369A1';
  const colorAcento = configuracion.color_acento || '#0EA5E9';
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Matriz Oficial de Menú por Rol y Casos de Uso (CU01 - CU15)
  const menuItems = [
    // --- ROL: OFICIAL DE CRÉDITO ---
    { label: 'Clientes', path: '/clientes', icon: Users, roles: ['ADMIN', 'OFICIAL'], cu: 'CU01' },
    { label: 'Solicitudes', path: '/solicitudes', icon: FileText, roles: ['ADMIN', 'OFICIAL'], cu: 'CU02' },
    { label: 'Garantías', path: '/garantias', icon: ShieldCheck, roles: ['ADMIN', 'OFICIAL'], cu: 'CU06' },
    { label: 'Desembolsos', path: '/desembolsos', icon: Banknote, roles: ['ADMIN', 'OFICIAL'], cu: 'CU11' },

    // --- ROL: CLIENTE ---
    { label: 'Mis Datos', path: '/mis-datos', icon: UserCheck, roles: ['CLIENTE'], cu: 'CU01' },
    { label: 'Mis Solicitudes', path: '/mis-solicitudes', icon: FolderOpen, roles: ['CLIENTE'], cu: 'CU02' },
    { label: 'Mis Pagos', path: '/mis-pagos', icon: History, roles: ['CLIENTE'], cu: 'CU12' },

    // --- ROL: ANALISTA DE CRÉDITO ---
    { label: 'Evaluacion', path: '/evaluacion', icon: CheckCircle2, roles: ['ADMIN', 'ANALISTA'], cu: 'CU03-CU05' },

    // --- ROL: JEFE DE CRÉDITOS ---
    { label: 'Bandeja de Aprobación', path: '/aprobaciones', icon: CheckCircle2, roles: ['ADMIN', 'JEFE'], cu: 'CU07-CU08' },

    // --- ROL: CAJERO ---
    { label: 'Caja / Registrar Pago', path: '/pagos', icon: DollarSign, roles: ['ADMIN', 'CAJERO'], cu: 'CU12' },

    // --- ROL: GERENTE ---
    { label: 'Reportes Gerenciales', path: '/reportes', icon: BarChart3, roles: ['ADMIN', 'GERENTE'], cu: 'CU14' },

    { label: 'Auditoría del Sistema', path: '/auditoria', icon: History, roles: ['ADMIN', 'GERENTE'], cu: 'RNF06' },
    // --- ROL: ADMINISTRADOR ---
    { label: 'Usuarios y Roles', path: '/usuarios', icon: UserCog, roles: ['ADMIN'], cu: 'CU15' },
    { label: 'Configuración institucional', path: '/configuracion-institucion', icon: Settings, roles: ['ADMIN'], cu: 'ADMIN' },
    
  ];

  // Filtrado estricto según el rol asignado en la sesión
  const menuFiltrado = menuItems.filter(item => item.roles.includes(usuario?.rol));
  const currentPage = menuItems.find(m => m.path === location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans" style={{ '--brand-primary': colorPrimario, '--brand-secondary': colorSecundario, '--brand-accent': colorAcento }}>
      
      {/* Overlay translúcido para móvil */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        style={{ backgroundColor: colorPrimario }}
        className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            {configuracion.url_logo ? (
              <img src={configuracion.url_logo} alt="Logotipo institucional" className="h-10 w-10 shrink-0 rounded-md bg-white object-contain p-1" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            ) : (
              <Building2 className="h-7 w-7 shrink-0" style={{ color: colorAcento }} />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-white">{configuracion.razon_social || 'SISTEMA DE CRÉDITOS'}</h1>
              <span className="block truncate text-[11px] font-medium" style={{ color: colorAcento }}>{configuracion.nit ? `NIT ${configuracion.nit}` : 'Gestión institucional de créditos'}</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuFiltrado.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active 
                    ? 'text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                style={active ? { backgroundColor: colorSecundario } : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  active ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.cu}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-sm font-semibold truncate text-white">{usuario?.nombre || 'Usuario'}</p>
            <span className="inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${colorSecundario}33`, color: colorAcento, borderColor: `${colorSecundario}99` }}>
              {usuario?.rol || 'SIN_ROL'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-800 truncate">
                {currentPage?.label || 'Panel Principal'}
              </h2>
              {currentPage?.cu && (
                <span className="text-xs text-slate-500 font-mono">Trazabilidad RTM: {currentPage.cu}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 shrink-0">
            <span className="hidden sm:inline">Modo:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs" style={{ backgroundColor: `${colorAcento}18`, color: colorSecundario, borderColor: `${colorSecundario}55` }}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: colorAcento }}></span>
              {usuario?.rol}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}