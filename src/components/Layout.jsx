import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Users, FileText, CheckSquare, CreditCard, 
  DollarSign, BarChart3, UserCog, LogOut, Building2 
} from 'lucide-react';

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Definición de ítems del menú por rol
  const menuItems = [
    { label: 'Clientes & Garantías', path: '/clientes', icon: Users, roles: ['ADMIN', 'OFICIAL'] },
    { label: 'Solicitudes', path: '/solicitudes', icon: FileText, roles: ['ADMIN', 'OFICIAL'] },
    { label: 'Evaluaciones & Riesgo', path: '/evaluacion', icon: CheckSquare, roles: ['ADMIN', 'ANALISTA'] },
    { label: 'Aprobación & Créditos', path: '/creditos', icon: CreditCard, roles: ['ADMIN', 'JEFE', 'OFICIAL'] },
    { label: 'Cobranza & Pagos', path: '/pagos', icon: DollarSign, roles: ['ADMIN', 'CAJERO'] },
    { label: 'Reportes Gerenciales', path: '/reportes', icon: BarChart3, roles: ['ADMIN', 'GERENTE'] },
    { label: 'Administrar Usuarios', path: '/usuarios', icon: UserCog, roles: ['ADMIN'] },
  ];

  const menuFiltrado = menuItems.filter(item => item.roles.includes(usuario?.rol));

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-navy-900 text-white flex flex-col shadow-xl">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800">
          <Building2 className="w-8 h-8 text-sky-400" />
          <div>
            <h1 className="font-bold text-base leading-tight">BANCO CREDITO</h1>
            <span className="text-xs text-sky-400">Sistema INF-241</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuFiltrado.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active 
                    ? 'bg-sky-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 bg-navy-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold truncate text-white">{usuario?.nombre}</p>
            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-sky-950 text-sky-300 border border-sky-800">
              {usuario?.rol}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h2 className="text-xl font-bold text-slate-800">
            {menuItems.find(m => m.path === location.pathname)?.label || 'Panel de Control'}
          </h2>
          <div className="text-xs text-slate-500 font-medium">
            Entorno: <span className="text-emerald-600 font-bold">Producción (Render API)</span>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}