import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, User } from 'lucide-react';
import { useConfiguracionInstitucion } from '../context/ConfiguracionInstitucionContext';

export default function LoginPage() {
  const [loginInput, setLoginInput] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { configuracion } = useConfiguracionInstitucion();
  const primary = configuracion.color_primario || '#0F172A';
  const secondary = configuracion.color_secundario || '#0369A1';
  const accent = configuracion.color_acento || '#0EA5E9';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(loginInput, clave);
    if (res.success) {
      navigate('/solicitudes');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="mb-3 inline-flex h-16 min-w-16 items-center justify-center rounded-xl bg-slate-50 p-3" style={{ color: secondary }}>
            {configuracion.url_logo ? <img src={configuracion.url_logo} alt="Logotipo institucional" className="max-h-12 max-w-40 object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <ShieldCheck className="h-10 w-10" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{configuracion.razon_social || 'Sistema de Créditos'}</h2>
          <p className="mt-1 text-sm text-slate-500">{configuracion.nit ? `NIT ${configuracion.nit}` : 'Gestión institucional de créditos'}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Usuario / Login</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="Ej: admin, oficial1"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                placeholder="••••••••"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 font-semibold text-white shadow-md transition-all hover:brightness-95 disabled:opacity-50" style={{ backgroundColor: secondary }}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}