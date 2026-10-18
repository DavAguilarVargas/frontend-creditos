import React, { useMemo, useState } from 'react';
import {
  BarChart3, Search, FileSpreadsheet, Printer, RefreshCw, Wallet,
  AlertOctagon, CreditCard, CalendarDays, FileText, AlertCircle,
} from 'lucide-react';
import { api } from '../api/axios';

const REPORTES = {
  cartera: { titulo: 'Cartera de crédito', endpoint: '/reportes/cartera' },
  mora: { titulo: 'Créditos en mora', endpoint: '/reportes/mora' },
  pagos: { titulo: 'Pagos registrados', endpoint: '/reportes/pagos' },
  creditos: { titulo: 'Detalle de créditos', endpoint: '/reportes/creditos' },
};

const ESTADOS_CREDITO = ['APROBADO', 'DESEMBOLSADO', 'VIGENTE', 'EN_MORA', 'CANCELADO'];
const METODOS_PAGO = ['EFECTIVO', 'QR', 'TRANSFERENCIA'];

const COLUMNAS = {
  cartera: [
    ['numero_credito', 'N.º crédito'], ['cliente', 'Cliente'], ['ci', 'CI'],
    ['estado', 'Estado'], ['monto_aprobado', 'Monto otorgado'],
    ['saldo_capital', 'Saldo de capital'], ['fecha_desembolso', 'Fecha desembolso'],
  ],
  mora: [
    ['numero_credito', 'N.º crédito'], ['cliente', 'Cliente'], ['ci', 'CI'],
    ['estado_credito', 'Estado crédito'], ['cuotas_vencidas', 'Cuotas vencidas'],
    ['fecha_vencimiento_mas_antigua', 'Vencimiento más antiguo'],
    ['monto_vencido', 'Importe de cuotas vencidas'], ['saldo_capital', 'Saldo de capital'],
  ],
  pagos: [
    ['fecha_pago_local', 'Fecha y hora (Bolivia)'], ['nro_transaccion', 'N.º transacción'],
    ['numero_credito', 'N.º crédito'], ['cliente', 'Cliente'], ['ci', 'CI'],
    ['numero_cuota', 'N.º cuota'], ['monto_pagado', 'Importe'], ['metodo_pago', 'Método'],
    ['referencia_externa', 'Referencia externa'],
  ],
  creditos: [
    ['numero_credito', 'N.º crédito'], ['cliente', 'Cliente'], ['ci', 'CI'],
    ['estado', 'Estado'], ['monto_aprobado', 'Monto otorgado'], ['saldo_capital', 'Saldo de capital'],
    ['tasa_interes', 'Tasa (%)'], ['plazo_meses', 'Plazo (meses)'],
    ['fecha_desembolso', 'Fecha desembolso'], ['total_cuotas', 'Cuotas'],
    ['cuotas_pagadas', 'Pagadas'], ['cuotas_abiertas', 'Pendientes/vencidas'],
  ],
};

const dinero = (value) => `Bs ${Number(value || 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const fecha = (value) => {
  if (!value) return '—';
  // Las fechas de calendario se muestran como YYYY-MM-DD sin pasarlas por Date,
  // para evitar desplazamientos de día debidos a zona horaria.
  const text = String(value).slice(0, 10);
  const parts = text.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : text;
};

const fechaHora = (value) => {
  if (!value) return '—';
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);
  if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}`;
  return text;
};

const camposMonetarios = new Set([
  'monto_aprobado', 'saldo_capital', 'monto_vencido', 'monto_pagado',
  'monto_total_otorgado', 'saldo_pendiente_total', 'monto_total_pagado',
]);
const camposFecha = new Set(['fecha_desembolso', 'fecha_solicitud', 'fecha_vencimiento_mas_antigua']);

function mostrarValor(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (camposMonetarios.has(campo)) return dinero(valor);
  if (camposFecha.has(campo)) return fecha(valor);
  if (campo === 'fecha_pago_local') return fechaHora(valor);
  if (campo === 'tasa_interes') return `${Number(valor).toLocaleString('es-BO', { maximumFractionDigits: 3 })}%`;
  return String(valor);
}

function escaparCSV(value) {
  let texto = value === null || value === undefined ? '' : String(value);
  // Neutraliza fórmulas al abrir el CSV en una hoja de cálculo.
  if (/^[\s]*[=+@-]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export default function ReportesPage() {
  const [tipo, setTipo] = useState('cartera');
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', estado: '', buscar: '' });
  const [reporte, setReporte] = useState(null);
  const [generadoEl, setGeneradoEl] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const config = REPORTES[tipo];
  const filas = useMemo(() => {
    if (!reporte) return [];
    if (tipo === 'cartera') return Array.isArray(reporte.creditos) ? reporte.creditos : [];
    if (tipo === 'mora') return Array.isArray(reporte.creditos_en_mora) ? reporte.creditos_en_mora : [];
    if (tipo === 'pagos') return Array.isArray(reporte.pagos) ? reporte.pagos : [];
    return Array.isArray(reporte.creditos) ? reporte.creditos : [];
  }, [reporte, tipo]);

  const totalCreditosCartera = (reporte?.resumen_cartera || []).reduce(
    (sum, row) => sum + Number(row.total_creditos || 0), 0,
  );
  const totalMontoCartera = (reporte?.resumen_cartera || []).reduce(
    (sum, row) => sum + Number(row.monto_total_otorgado || 0), 0,
  );
  const saldoCartera = (reporte?.resumen_cartera || []).reduce(
    (sum, row) => sum + Number(row.saldo_pendiente_total || 0), 0,
  );

  const cambiarFiltro = (campo, valor) => setFiltros((actual) => ({ ...actual, [campo]: valor }));

  const generarReporte = async (event) => {
    event?.preventDefault();
    setCargando(true);
    setError('');
    setReporte(null);
    setGeneradoEl('');

    const params = {};
    if (filtros.desde) params.desde = filtros.desde;
    if (filtros.hasta) params.hasta = filtros.hasta;
    if (filtros.buscar.trim()) params.buscar = filtros.buscar.trim();
    if (filtros.estado) {
      if (tipo === 'pagos') params.metodo_pago = filtros.estado;
      else params.estado = filtros.estado;
    }

    try {
      const response = await api.get(config.endpoint, { params });
      setReporte(response.data || {});
      setGeneradoEl(new Intl.DateTimeFormat('es-BO', {
        dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/La_Paz',
      }).format(new Date()));
    } catch (err) {
      const status = err?.response?.status;
      const mensajeServidor = err?.response?.data?.error || err?.response?.data?.mensaje;
      if (status === 401) setError('La sesión no es válida o ha expirado. Inicia sesión nuevamente.');
      else if (status === 403) setError('Tu usuario no tiene permiso para consultar reportes gerenciales.');
      else if (status === 400) setError(mensajeServidor || 'Los filtros no son válidos. Revisa las fechas y los valores seleccionados.');
      else if (status === 500) setError(mensajeServidor || 'El servidor no pudo generar el reporte. Revisa el registro del backend para identificar el detalle técnico.');
      else setError(mensajeServidor || 'No fue posible conectar con el servidor de reportes.');
      console.error('CU14: error al generar reporte', {
        tipo,
        status,
        message: err?.message,
        requestId: err?.response?.headers?.['x-request-id'],
      });
    } finally {
      setCargando(false);
    }
  };

  const exportarCSV = () => {
    if (!filas.length) return;
    const columnas = COLUMNAS[tipo];
    const contenido = [
      columnas.map(([, titulo]) => escaparCSV(titulo)).join(';'),
      ...filas.map((fila) => columnas.map(([campo]) => escaparCSV(fila[campo])).join(';')),
    ].join('\r\n');
    const blob = new Blob([`\uFEFF${contenido}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    const hoyBolivia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    enlace.download = `reporte-${tipo}-${hoyBolivia}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  };

  const limpiar = () => {
    setFiltros({ desde: '', hasta: '', estado: '', buscar: '' });
    setReporte(null);
    setError('');
    setGeneradoEl('');
  };

  const ayudaPeriodo = tipo === 'pagos'
    ? 'El período se aplica a la fecha del pago, usando la hora de Bolivia.'
    : tipo === 'mora'
      ? 'El período se aplica a la fecha de vencimiento de las cuotas vencidas.'
      : 'El período se aplica a la fecha de desembolso. Sin fechas se consulta toda la cartera.';

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes gerenciales</h1>
          <p className="mt-1 text-sm text-slate-500">CU14 · Consulta de cartera, mora, pagos y créditos con filtros.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportarCSV} disabled={!filas.length || cargando}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
            <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
          </button>
          <button type="button" onClick={() => window.print()} disabled={!reporte || cargando}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <form onSubmit={generarReporte} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm font-medium text-slate-700">
              Tipo de reporte
              <select value={tipo} onChange={(e) => { setTipo(e.target.value); setFiltros((actual) => ({ ...actual, estado: '' })); setReporte(null); setError(''); }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
                {Object.entries(REPORTES).map(([valor, item]) => <option key={valor} value={valor}>{item.titulo}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Desde
              <input type="date" value={filtros.desde} max={filtros.hasta || undefined}
                onChange={(e) => cambiarFiltro('desde', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Hasta
              <input type="date" value={filtros.hasta} min={filtros.desde || undefined}
                onChange={(e) => cambiarFiltro('hasta', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {tipo === 'pagos' ? 'Método de pago' : 'Estado'}
              <select value={filtros.estado} onChange={(e) => cambiarFiltro('estado', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
                <option value="">Todos</option>
                {(tipo === 'pagos' ? METODOS_PAGO : tipo === 'mora' ? ['VIGENTE', 'EN_MORA'] : ESTADOS_CREDITO)
                  .map((estado) => <option key={estado} value={estado}>{estado.replace('_', ' ')}</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block flex-1 text-sm font-medium text-slate-700">
              Buscar cliente, CI, número de crédito o transacción
              <Search className="pointer-events-none absolute left-3 top-[2.35rem] h-4 w-4 text-slate-400" />
              <input type="search" maxLength={100} value={filtros.buscar}
                onChange={(e) => cambiarFiltro('buscar', e.target.value)} placeholder="Escribe un dato para filtrar…"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={cargando}
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60">
                {cargando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                {cargando ? 'Generando…' : 'Generar reporte'}
              </button>
              <button type="button" onClick={limpiar} disabled={cargando}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Limpiar
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">{ayudaPeriodo} Se muestran como máximo 1.000 filas de detalle por consulta.</p>
        </form>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-semibold">No se pudo generar el reporte</p><p className="mt-1">{error}</p></div>
        </div>
      )}

      {!reporte && !error && !cargando && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-800">Selecciona un reporte y sus filtros</h2>
          <p className="mt-1 text-sm text-slate-500">Presiona “Generar reporte” para consultar la información autorizada.</p>
        </div>
      )}

      {reporte && (
        <section className="space-y-5 rounded-xl print:space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{config.titulo}</h2>
              <p className="text-sm text-slate-500">Generado: {generadoEl || '—'} · Datos consultados en el sistema.</p>
            </div>
            <p className="text-xs text-slate-500 print:hidden">Los importes se expresan en bolivianos (Bs).</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {tipo === 'cartera' && <>
              <Kpi icon={<CreditCard className="h-5 w-5" />} label="Créditos en resultado" value={totalCreditosCartera.toLocaleString('es-BO')} />
              <Kpi icon={<Wallet className="h-5 w-5" />} label="Monto otorgado" value={dinero(totalMontoCartera)} />
              <Kpi icon={<BarChart3 className="h-5 w-5" />} label="Saldo de capital" value={dinero(saldoCartera)} />
            </>}
            {tipo === 'mora' && <>
              <Kpi icon={<AlertOctagon className="h-5 w-5" />} label="Créditos en resultado" value={Number(reporte.resumen_mora?.creditos_en_mora || 0).toLocaleString('es-BO')} />
              <Kpi icon={<CalendarDays className="h-5 w-5" />} label="Cuotas vencidas" value={Number(reporte.resumen_mora?.cuotas_vencidas || 0).toLocaleString('es-BO')} />
              <Kpi icon={<Wallet className="h-5 w-5" />} label="Importe de cuotas vencidas" value={dinero(reporte.resumen_mora?.monto_vencido)} />
            </>}
            {tipo === 'pagos' && <>
              <Kpi icon={<FileText className="h-5 w-5" />} label="Pagos registrados" value={Number(reporte.resumen_pagos?.total_pagos || 0).toLocaleString('es-BO')} />
              <Kpi icon={<Wallet className="h-5 w-5" />} label="Importe total" value={dinero(reporte.resumen_pagos?.monto_total_pagado)} />
              <Kpi icon={<CalendarDays className="h-5 w-5" />} label="Filas detalladas" value={filas.length.toLocaleString('es-BO')} />
            </>}
            {tipo === 'creditos' && <>
              <Kpi icon={<CreditCard className="h-5 w-5" />} label="Créditos en resultado" value={filas.length.toLocaleString('es-BO')} />
              <Kpi icon={<Wallet className="h-5 w-5" />} label="Monto otorgado (detalle)" value={dinero(filas.reduce((sum, row) => sum + Number(row.monto_aprobado || 0), 0))} />
              <Kpi icon={<BarChart3 className="h-5 w-5" />} label="Saldo de capital (detalle)" value={dinero(filas.reduce((sum, row) => sum + Number(row.saldo_capital || 0), 0))} />
            </>}
          </div>

          {tipo === 'cartera' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3"><h3 className="font-semibold text-slate-800">Resumen por estado</h3></div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Créditos</th><th className="px-4 py-3 text-right">Monto otorgado</th><th className="px-4 py-3 text-right">Saldo pendiente</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(reporte.resumen_cartera || []).map((row) => <tr key={row.estado}>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.estado}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.total_creditos}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{dinero(row.monto_total_otorgado)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{dinero(row.saldo_pendiente_total)}</td>
                    </tr>)}
                    {!(reporte.resumen_cartera || []).length && <tr><td colSpan={4} className="px-4 py-7 text-center text-slate-500">No hay resultados para los filtros aplicados.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="font-semibold text-slate-800">Detalle del reporte</h3>
              <span className="text-xs text-slate-500">{filas.length.toLocaleString('es-BO')} filas recibidas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>{COLUMNAS[tipo].map(([campo, titulo]) => <th key={campo} className="whitespace-nowrap px-4 py-3">{titulo}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.map((fila, indice) => <tr key={fila.id_credito || fila.id_pago || fila.numero_credito || indice} className="hover:bg-slate-50">
                    {COLUMNAS[tipo].map(([campo]) => <td key={campo} className="whitespace-nowrap px-4 py-3 text-slate-700">{mostrarValor(campo, fila[campo])}</td>)}
                  </tr>)}
                  {!filas.length && <tr><td colSpan={COLUMNAS[tipo].length} className="px-4 py-8 text-center text-slate-500">No hay registros que coincidan con los filtros.</td></tr>}
                </tbody>
              </table>
            </div>
            {reporte.limite_aplicado && filas.length >= reporte.limite_aplicado &&
              <p className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">La consulta alcanzó el límite de {reporte.limite_aplicado} filas. Refina los filtros para revisar otros registros.</p>}
            {tipo === 'mora' && reporte.nota && <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">{reporte.nota}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="rounded-lg bg-sky-50 p-3 text-sky-700">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-words text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
