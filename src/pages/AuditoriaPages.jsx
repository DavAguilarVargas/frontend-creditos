import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, FileSearch, History, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api } from '../api/axios';
import { formatoFechaHoraLocalBolivia } from '../utils/fechaBolivia';

function fechaHora(value) {
  // El backend entrega fecha_hora convertida a America/La_Paz, sin zona ambigua.
  return formatoFechaHoraLocalBolivia(value);
}

const etiquetaOperacion = (operation) => ({
  FIRMA_CONTRATO_OK: 'Verificación de firma de contrato',
  CONFIRMAR_FIRMA_CONTRATO: 'Verificación de firma de contrato (histórico)',
  DESEMBOLSAR_CREDITO: 'Registro de desembolso',
  APROBAR_SOLICITUD: 'Aprobación de solicitud',
  RECHAZAR_SOLICITUD: 'Rechazo de solicitud',
  GENERAR_CONTRATO: 'Generación de contrato',
  GENERAR_CRONOGRAMA: 'Generación de cronograma',
  REGISTRAR_GARANTIA: 'Registro de garantía',
}[operation] || operation || 'Operación');

export default function AuditoriaPage() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', operacion: '', entidad: '', usuario: '' });
  const [aplicados, setAplicados] = useState({ desde: '', hasta: '', operacion: '', entidad: '', usuario: '' });

  const cargarEventos = useCallback(async (params = aplicados, refresco = false) => {
    if (refresco) setActualizando(true);
    else setCargando(true);
    setError('');
    try {
      const limpios = Object.fromEntries(Object.entries(params).filter(([, value]) => String(value || '').trim() !== ''));
      const response = await api.get('/auditoria', { params: limpios });
      setEventos(Array.isArray(response.data?.eventos) ? response.data.eventos : []);
    } catch (err) {
      setError(err?.response?.data?.error || 'No fue posible cargar los eventos de auditoría. Verifique su rol y la conexión con el servidor.');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [aplicados]);

  useEffect(() => {
    cargarEventos(aplicados);
    // La consulta inicial se realiza una vez; los filtros se aplican con el botón.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiarFiltro = (event) => setFiltros((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  const aplicarFiltros = (event) => {
    event.preventDefault();
    setAplicados({ ...filtros });
    cargarEventos({ ...filtros });
  };
  const limpiarFiltros = () => {
    const vacios = { desde: '', hasta: '', operacion: '', entidad: '', usuario: '' };
    setFiltros(vacios);
    setAplicados(vacios);
    cargarEventos(vacios, true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-900">Auditoría del sistema</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Registro de solo lectura de operaciones críticas (RNF06). Acceso restringido a ADMIN y GERENTE.</p>
        </div>
        <button type="button" onClick={() => cargarEventos(aplicados, true)} disabled={actualizando || cargando} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${actualizando ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </header>

      <form onSubmit={aplicarFiltros} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        <label className="block text-xs font-semibold text-slate-600">Desde
          <input type="date" name="desde" value={filtros.desde} onChange={cambiarFiltro} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label className="block text-xs font-semibold text-slate-600">Hasta
          <input type="date" name="hasta" value={filtros.hasta} onChange={cambiarFiltro} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label className="block text-xs font-semibold text-slate-600">Operación
          <input type="text" name="operacion" value={filtros.operacion} onChange={cambiarFiltro} placeholder="Ej. DESEMBOLSAR" maxLength={60} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label className="block text-xs font-semibold text-slate-600">Entidad
          <input type="text" name="entidad" value={filtros.entidad} onChange={cambiarFiltro} placeholder="Ej. CREDITO" maxLength={40} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label className="block text-xs font-semibold text-slate-600">ID de usuario
          <input type="number" min="1" name="usuario" value={filtros.usuario} onChange={cambiarFiltro} placeholder="Todos" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-5">
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-accent,#0ea5e9)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"><Search className="h-4 w-4" /> Aplicar filtros</button>
          <button type="button" onClick={limpiarFiltros} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Limpiar</button>
        </div>
      </form>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-slate-500" /><h2 className="text-sm font-bold text-slate-800">Eventos registrados</h2></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{eventos.length} eventos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr><th className="p-4">Fecha y hora</th><th className="p-4">Usuario</th><th className="p-4">Operación</th><th className="p-4">Entidad</th><th className="p-4">ID relacionado</th><th className="p-4">Resultado</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cargando ? <tr><td colSpan="6" className="p-8 text-center text-slate-500">Cargando auditoría...</td></tr>
                : eventos.length ? eventos.map((evento) => (
                  <tr key={evento.id_auditoria} className="align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap p-4 text-xs">{fechaHora(evento.fecha_hora)}</td>
                    <td className="p-4"><div className="font-semibold">{evento.usuario || 'Usuario'}</div><div className="text-xs text-slate-500">{evento.login || `ID ${evento.id_usuario}`}</div></td>
                    <td className="p-4"><div className="font-semibold">{etiquetaOperacion(evento.operacion)}</div><div className="mt-1 font-mono text-[10px] text-slate-400">{evento.operacion}</div></td>
                    <td className="p-4">{evento.entidad || '—'}</td>
                    <td className="p-4">{evento.id_entidad ?? '—'}</td>
                    <td className="p-4"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{evento.resultado || '—'}</span></td>
                  </tr>
                ))
                : <tr><td colSpan="6" className="p-10 text-center text-slate-500"><FileSearch className="mx-auto mb-2 h-7 w-7 text-slate-300" />No hay eventos para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Consulta de solo lectura. Se muestran como máximo 500 eventos por consulta.</footer>
      </section>
    </div>
  );
}
