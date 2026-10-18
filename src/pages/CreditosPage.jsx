import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { AlertTriangle, ArrowRight, FileCheck, Loader2, RefreshCw, Search } from 'lucide-react';

const money = (value) => new Intl.NumberFormat('es-BO', {
  style: 'currency', currency: 'BOB', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value || 0));

const fecha = (value) => {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
};

export default function CreditosPage() {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await api.get('/solicitudes');
      setSolicitudes(Array.isArray(respuesta.data) ? respuesta.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible cargar los créditos desde el servidor.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = solicitudes.filter((s) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return [s.id_solicitud, s.cliente, s.ci, s.numero_credito, s.numero_contrato]
      .some((valor) => String(valor ?? '').toLowerCase().includes(termino));
  });

  const badge = (estado) => {
    const clase = estado === 'APROBADA' || estado === 'VIGENTE'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : estado === 'RECHAZADA' || estado === 'CANCELADO'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : estado === 'EN_MORA'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-slate-50 text-slate-700 border-slate-200';
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${clase}`}>{estado || 'SIN CREDITO'}</span>;
  };

  return (
    <div className="space-y-6 text-slate-800">
      <header className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2"><FileCheck className="h-6 w-6 text-slate-800" /><h1 className="text-xl font-bold">Control de créditos</h1></div>
          <p className="mt-1 text-xs text-slate-500">Vista consolidada de solicitudes, créditos, contratos y estados registrados.</p>
        </div>
        <button type="button" onClick={cargar} disabled={cargando} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">{cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar</button>
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:max-w-md"><Search className="h-4 w-4 text-slate-400" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por solicitud, cliente, CI o crédito" className="w-full text-sm outline-none" /></div>

      {error && <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertTriangle className="h-5 w-5 shrink-0" /><span className="flex-1">{error}</span><button type="button" onClick={cargar} className="font-semibold underline">Reintentar</button></div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="p-4">Solicitud / titular</th><th className="p-4">Condiciones solicitadas</th><th className="p-4">Crédito</th><th className="p-4">Contrato</th><th className="p-4">Estado</th><th className="p-4 text-right">Acción</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? <tr><td colSpan="6" className="p-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Consultando Supabase...</td></tr>
                : filtradas.length === 0 ? <tr><td colSpan="6" className="p-10 text-center text-slate-500">No se encontraron solicitudes.</td></tr>
                  : filtradas.map((s) => (
                    <tr key={s.id_solicitud} className="hover:bg-slate-50/70">
                      <td className="p-4"><span className="mb-1 inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold">SOL-#{s.id_solicitud}</span><p className="font-semibold">{s.cliente || `${s.nombres || ''} ${s.apellidos || ''}`.trim()}</p><p className="mt-1 text-xs text-slate-500">CI: {s.ci || '—'}</p><p className="mt-1 text-[11px] text-slate-400">{fecha(s.fecha_solicitud)}</p></td>
                      <td className="p-4"><p className="font-bold">{money(s.monto_solicitado)}</p><p className="mt-1 text-xs text-slate-500">{s.plazo_meses} meses · {Number(s.tasa_interes_anual || 0).toFixed(3)}% anual</p><p className="mt-1 text-xs text-slate-500">{s.destino_credito || '—'}</p></td>
                      <td className="p-4">{s.numero_credito ? <><p className="font-mono text-xs font-bold">{s.numero_credito}</p><p className="mt-1 text-xs">{money(s.monto_aprobado)}</p><p className="mt-1 text-xs text-slate-500">{s.estado_credito}</p></> : <span className="text-xs text-slate-400">Aún no creado</span>}</td>
                      <td className="p-4">{s.numero_contrato ? <><p className="font-mono text-xs font-bold">{s.numero_contrato}</p><p className="mt-1 text-xs text-slate-500">{s.estado_contrato}</p></> : <span className="text-xs text-slate-400">No generado</span>}</td>
                      <td className="p-4">{badge(s.estado)}{s.estado_credito && <div className="mt-2">{badge(s.estado_credito)}</div>}</td>
                      <td className="p-4 text-right">{s.estado === 'EN_EVALUACION' ? <button type="button" onClick={() => navigate('/aprobaciones')} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Ir a aprobación <ArrowRight className="h-3.5 w-3.5" /></button> : s.estado === 'APROBADA' && s.id_credito ? <button type="button" onClick={() => navigate('/aprobaciones')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50">Ver expediente <ArrowRight className="h-3.5 w-3.5" /></button> : <span className="text-xs text-slate-400">—</span>}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs leading-relaxed text-slate-500">La aprobación se realiza desde la bandeja CU07. Esta pantalla es de consulta; no realiza aprobaciones ni desembolsos simulados.</p>
    </div>
  );
}
