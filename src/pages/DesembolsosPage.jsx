import React, { useCallback, useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import {
  Banknote,
  CheckCircle2,
  ShieldAlert,
  X,
  Calendar,
  Send,
  Lock,
  AlertTriangle,
  RefreshCw,
  Search,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useConfiguracionInstitucion } from '../context/ConfiguracionInstitucionContext';
import { formatoFechaBolivia, formatoFechaHoraBolivia } from '../utils/fechaBolivia';

const ESTADOS_CREDITO_ACTIVO = new Set(['VIGENTE', 'EN_MORA', 'CANCELADO', 'DESEMBOLSADO']);

const money = (value) => Number(value || 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(value) {
  return formatoFechaBolivia(value, 'No registrada');
}

function formatDateTime(value) {
  return formatoFechaHoraBolivia(value);
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.mensaje || fallback;
}

function colorHexToRgb(color, fallback = [15, 23, 42]) {
  if (!/^#[0-9a-f]{6}$/i.test(String(color || ''))) return fallback;
  const hex = color.slice(1);
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

function descargarConstanciaInterna({ credito, referencia, medio, usuario, configuracion, fechaDesembolso, modoDesembolso }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const [r, g, b] = colorHexToRgb(configuracion?.color_primario);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(String(configuracion?.razon_social || 'INSTITUCIÓN FINANCIERA').slice(0, 60), 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIT: ${configuracion?.nit || 'No configurado'}`, 14, 20);
  doc.text(modoDesembolso === 'SIMULACION' ? 'CONSTANCIA DE SIMULACIÓN DE DESEMBOLSO' : 'CONSTANCIA INTERNA DE REGISTRO DE DESEMBOLSO', 14, 27);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RESUMEN DE LA OPERACIÓN', 14, 44);

  const items = [
    ['Número de crédito', credito.numero_credito || `CR-${credito.id_credito}`],
    ['Número de solicitud', String(credito.id_solicitud)],
    ['Número de contrato', credito.numero_contrato || '—'],
    ['Prestatario', credito.cliente || '—'],
    ['Documento de identidad', credito.ci || '—'],
    ['Monto aprobado/desembolsado', `Bs. ${money(credito.monto_aprobado)}`],
    ['Fecha de desembolso (fecha registrada en la base de datos)', formatDate(fechaDesembolso)],
    ['Medio reportado', medio],
    ['Referencia externa', referencia],
    ['Modo de operación', modoDesembolso === 'SIMULACION' ? 'SIMULACIÓN — SIN MOVIMIENTO MONETARIO' : 'OPERACIÓN REAL REPORTADA'],
    ['Estado del crédito', modoDesembolso === 'SIMULACION' ? 'DESEMBOLSADO (SIMULACIÓN)' : 'VIGENTE'],
    ['Operador autenticado', usuario?.nombre || usuario?.nombre_completo || usuario?.login || 'Usuario autorizado'],
  ];

  let y = 52;
  for (const [label, value] of items) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(String(value), 78);
    doc.text(wrapped, 82, y);
    y += Math.max(7, wrapped.length * 4.5);
  }

  y += 5;
  doc.setDrawColor(217, 119, 6);
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(14, y, pageWidth - 28, 31, 2, 2, 'FD');
  doc.setTextColor(120, 53, 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ACLARACIÓN IMPORTANTE', 19, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(
    modoDesembolso === 'SIMULACION'
      ? 'DOCUMENTO DE PRUEBA: se registró una respuesta de una API simulada. No se movió dinero, no existe transferencia real y esta constancia no es comprobante financiero.'
      : 'Esta constancia acredita el registro administrativo realizado en el sistema a partir de la referencia reportada por un usuario autorizado. No es un comprobante emitido por el Core Bancario ni sustituye la confirmación independiente de la operación monetaria.',
    pageWidth - 38,
  ), 19, y + 13);

  const footerY = doc.internal.pageSize.getHeight() - 16;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  const footer = [configuracion?.direccion, configuracion?.telefono, configuracion?.correo_contacto]
    .filter(Boolean)
    .join(' · ');
  if (footer) doc.text(doc.splitTextToSize(footer, pageWidth - 28), 14, footerY - 4);
  doc.text('Documento interno de trazabilidad. Conservar junto al comprobante externo.', 14, footerY + 1);
  doc.save(`${modoDesembolso === 'SIMULACION' ? 'SIMULACION' : 'Constancia_Interna_Desembolso'}_${credito.numero_credito || credito.id_credito}.pdf`);
}

export default function DesembolsosPage() {
  const { usuario } = useAuth();
  const { configuracion } = useConfiguracionInstitucion();

  const [creditos, setCreditos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState(null);
  const [modal, setModal] = useState(null); // { tipo: 'firma' | 'desembolso', credito }
  const [firmaVerificada, setFirmaVerificada] = useState(false);
  const [desembolsoConfirmado, setDesembolsoConfirmado] = useState(false);
  const [referenciaExterna, setReferenciaExterna] = useState('');
  const [medioDesembolso, setMedioDesembolso] = useState('TRANSFERENCIA');
  const [modoDesembolso, setModoDesembolso] = useState('SIMULACION');
  const [numeroCuentaDestino, setNumeroCuentaDestino] = useState('');
  const [respuestaCore, setRespuestaCore] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const mostrarNotificacion = useCallback((tipo, titulo, mensaje) => {
    setNotificacion({ tipo, titulo, mensaje });
  }, []);

  useEffect(() => {
    if (!notificacion) return undefined;
    const timer = window.setTimeout(() => setNotificacion(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notificacion]);

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (silencioso) setRecargando(true);
    else setCargando(true);
    setErrorCarga('');
    try {
      const response = await api.get('/creditos/desembolsos/listado');
      const payload = response.data || {};
      setCreditos(Array.isArray(payload.creditos) ? payload.creditos : []);
    } catch (error) {
      setErrorCarga(getErrorMessage(error, 'No fue posible cargar los créditos para desembolso.'));
    } finally {
      setCargando(false);
      setRecargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const pendientes = useMemo(() => creditos
    .filter((credito) => credito.estado_credito === 'APROBADO')
    .filter((credito) => {
      const searchable = `${credito.numero_credito || ''} ${credito.id_solicitud || ''} ${credito.cliente || ''} ${credito.ci || ''}`.toLowerCase();
      return searchable.includes(busqueda.trim().toLowerCase());
    }), [creditos, busqueda]);

  const vigentes = useMemo(() => creditos
    .filter((credito) => ESTADOS_CREDITO_ACTIVO.has(credito.estado_credito))
    .filter((credito) => {
      const searchable = `${credito.numero_credito || ''} ${credito.id_solicitud || ''} ${credito.cliente || ''} ${credito.ci || ''}`.toLowerCase();
      return searchable.includes(busqueda.trim().toLowerCase());
    }), [creditos, busqueda]);

  const cronogramaCompleto = (credito) => Number(credito.cantidad_cuotas) === Number(credito.plazo_meses)
    && Number(credito.plazo_meses) > 0;
  const contratoFirmado = (credito) => credito.estado_contrato === 'FIRMADO';
  const listoParaDesembolso = (credito) => credito.estado_credito === 'APROBADO'
    && contratoFirmado(credito)
    && cronogramaCompleto(credito);

  const abrirModalFirma = (credito) => {
    setFirmaVerificada(false);
    setModal({ tipo: 'firma', credito });
  };

  const abrirModalDesembolso = (credito) => {
    if (!listoParaDesembolso(credito)) {
      mostrarNotificacion('error', 'Operación bloqueada', 'El crédito debe tener contrato FIRMADO y cronograma completo antes de registrar el desembolso.');
      return;
    }
    setReferenciaExterna('');
    setMedioDesembolso('TRANSFERENCIA');
    setModoDesembolso('SIMULACION');
    setNumeroCuentaDestino('');
    setRespuestaCore(null);
    setDesembolsoConfirmado(false);
    setModal({ tipo: 'desembolso', credito });
  };

  const confirmarFirma = async () => {
    if (!modal?.credito || !firmaVerificada) {
      mostrarNotificacion('error', 'Falta confirmación', 'Confirme que la firma física fue verificada y que el documento firmado quedó resguardado en el expediente.');
      return;
    }

    setProcesando(true);
    try {
      await api.post(`/creditos/${modal.credito.id_credito}/contrato/confirmar-firma`, {
        firma_verificada: true,
        documento_resguardado: true,
      });
      mostrarNotificacion('success', 'Firma registrada', 'La verificación documental quedó registrada. El crédito será revisado para habilitar el desembolso.');
      setModal(null);
      await cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('error', 'No se pudo confirmar la firma', getErrorMessage(error, 'Verifique el contrato y vuelva a intentarlo.'));
    } finally {
      setProcesando(false);
    }
  };

  const simularCore = async () => {
    if (!modal?.credito) return;
    setProcesando(true);
    try {
      const response = await api.post('/integraciones/core/desembolsar', {
        id_credito: modal.credito.id_credito,
        numero_cuenta: numeroCuentaDestino.trim() || undefined,
        monto: Number(modal.credito.monto_aprobado),
      });
      const data = response.data || {};
      if (data.exito !== true || data.modo !== 'SIMULACION' || !data.codigo_transaccion_core) {
        throw new Error('La API no devolvió una respuesta válida de simulación.');
      }
      setRespuestaCore(data);
      setReferenciaExterna(data.codigo_transaccion_core);
      setDesembolsoConfirmado(false);
      mostrarNotificacion('success', 'Respuesta simulada recibida', 'La API de prueba generó una referencia. No se ejecutó ninguna transferencia real.');
    } catch (error) {
      mostrarNotificacion('error', 'Falló la simulación de Core', getErrorMessage(error, 'No fue posible obtener una respuesta de la API simulada.'));
    } finally {
      setProcesando(false);
    }
  };

  const confirmarDesembolso = async () => {
    if (!modal?.credito) return;
    const referencia = referenciaExterna.trim();
    if (referencia.length < 4 || referencia.length > 120) {
      mostrarNotificacion('error', 'Referencia inválida', 'La referencia debe tener entre 4 y 120 caracteres.');
      return;
    }
    if (!desembolsoConfirmado) {
      mostrarNotificacion('error', 'Confirmación obligatoria', modoDesembolso === 'SIMULACION'
        ? 'Confirme que se trata de una simulación sin movimiento monetario real.'
        : 'Confirme que el desembolso real se ejecutó y verificó fuera de este sistema.');
      return;
    }
    if (modoDesembolso === 'SIMULACION' && (!respuestaCore?.codigo_transaccion_core || respuestaCore.codigo_transaccion_core !== referencia)) {
      mostrarNotificacion('error', 'Simulación pendiente', 'Primero solicite una respuesta a la API simulada del Core.');
      return;
    }

    setProcesando(true);
    try {
      const response = await api.post('/creditos/desembolsar', {
        id_credito: modal.credito.id_credito,
        referencia_externa: referencia,
        medio_desembolso: medioDesembolso,
        modo_desembolso: modoDesembolso,
        numero_cuenta: numeroCuentaDestino.trim() || undefined,
        confirmacion_externa: modoDesembolso === 'REAL' ? true : false,
        confirmacion_simulacion: modoDesembolso === 'SIMULACION' ? true : false,
      });
      mostrarNotificacion('success', modoDesembolso === 'SIMULACION' ? 'Simulación registrada' : 'Desembolso registrado', response.data?.mensaje || 'La operación se registró.');
      descargarConstanciaInterna({
        credito: modal.credito,
        referencia,
        medio: medioDesembolso,
        usuario,
        configuracion,
        fechaDesembolso: response.data?.fecha_desembolso,
        modoDesembolso,
      });
      setModal(null);
      await cargarDatos(true);
    } catch (error) {
      mostrarNotificacion('error', 'No se pudo registrar el desembolso', getErrorMessage(error, 'Verifique el contrato, cronograma y referencia externa.'));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-6">
      {notificacion && (
        <div className="fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-md" role="status" aria-live="polite">
          <div className={`flex items-start gap-3 rounded-xl border bg-slate-900 p-4 text-white shadow-2xl ${notificacion.tipo === 'success' ? 'border-emerald-500' : 'border-rose-500'}`}>
            {notificacion.tipo === 'success'
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold">{notificacion.titulo}</h4>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{notificacion.mensaje}</p>
            </div>
            <button type="button" onClick={() => setNotificacion(null)} className="text-slate-400 hover:text-white" aria-label="Cerrar notificación"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Banknote className="h-6 w-6 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-800">Desembolso de créditos (CU11 / RF12)</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">Validación de contrato firmado, cronograma completo y trazabilidad de la operación.</p>
        </div>
        <button type="button" onClick={() => cargarDatos(true)} disabled={recargando || cargando} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${recargando ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Confirmación externa obligatoria</p>
            <p className="mt-1 text-xs leading-relaxed">Esta versión no está integrada automáticamente con un Core bancario. Registre el desembolso solamente después de verificar la operación en el canal institucional autorizado y de contar con una referencia real. La constancia PDF generada es un registro interno y no sustituye el comprobante externo.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por crédito, solicitud, cliente o CI..." className="w-full border-0 bg-transparent text-sm outline-none focus:ring-0" />
        </div>
      </div>

      {errorCarga && (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-semibold">No se pudieron cargar los créditos</p><p className="mt-1 text-xs">{errorCarga}</p></div>
          <button type="button" onClick={() => cargarDatos()} className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-rose-100">Reintentar</button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Créditos aprobados pendientes de desembolso</h2>
            <p className="mt-1 text-xs text-slate-500">Solo se habilita la operación cuando la firma y el cronograma están validados.</p>
          </div>
          <span className="w-fit rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">{pendientes.length} pendientes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="p-4">Crédito / prestatario</th>
                <th className="p-4">Monto / plazo</th>
                <th className="p-4">Contrato</th>
                <th className="p-4">Cronograma</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cargando ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Cargando créditos...</td></tr>
              ) : pendientes.length ? pendientes.map((credito) => {
                const scheduleOk = cronogramaCompleto(credito);
                const signed = contratoFirmado(credito);
                return (
                  <tr key={credito.id_credito} className="hover:bg-slate-50/80">
                    <td className="p-4">
                      <span className="mb-1 inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700">{credito.numero_credito || `CR-${credito.id_credito}`}</span>
                      <div className="font-semibold text-slate-900">{credito.cliente}</div>
                      <div className="mt-0.5 text-xs text-slate-400">CI: {credito.ci || '—'} · Solicitud #{credito.id_solicitud}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">Bs. {money(credito.monto_aprobado)}</div>
                      <div className="mt-1 text-xs text-slate-500">{credito.plazo_meses} meses · {Number(credito.tasa_interes).toFixed(3)}% anual</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{credito.numero_contrato || 'No generado'}</div>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${signed ? 'bg-emerald-50 text-emerald-700' : credito.estado_contrato === 'PENDIENTE_FIRMA' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>{credito.estado_contrato || 'SIN CONTRATO'}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${scheduleOk ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                        <Calendar className="h-3.5 w-3.5" /> {Number(credito.cantidad_cuotas)}/{credito.plazo_meses} cuotas
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {!signed ? (
                        <button type="button" disabled={credito.estado_contrato !== 'PENDIENTE_FIRMA' || !scheduleOk} onClick={() => abrirModalFirma(credito)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
                          <ClipboardCheck className="h-3.5 w-3.5" /> Verificar firma
                        </button>
                      ) : (
                        <button type="button" disabled={!scheduleOk} onClick={() => abrirModalDesembolso(credito)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent,#0ea5e9)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                          <Send className="h-3.5 w-3.5" /> Registrar desembolso
                        </button>
                      )}
                      {!scheduleOk && <p className="mt-1 max-w-44 text-[10px] text-rose-600">Cronograma incompleto: no se puede desembolsar.</p>}
                    </td>
                  </tr>
                );
              }) : !errorCarga ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay créditos aprobados pendientes de desembolso.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div><h2 className="text-sm font-bold text-slate-800">Créditos con desembolso registrado</h2><p className="mt-1 text-xs text-slate-500">Se consultan desde la base de datos, no desde memoria local.</p></div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{vigentes.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr><th className="p-4">Crédito / cliente</th><th className="p-4">Monto</th><th className="p-4">Fecha de desembolso</th><th className="p-4">Referencia / operación</th><th className="p-4">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cargando ? <tr><td colSpan="5" className="p-8 text-center text-slate-500">Cargando...</td></tr> : vigentes.length ? vigentes.map((credito) => (
                <tr key={credito.id_credito} className="hover:bg-slate-50/80">
                  <td className="p-4"><div className="font-semibold text-slate-900">{credito.numero_credito}</div><div className="text-xs text-slate-500">{credito.cliente} · SOL-#{credito.id_solicitud}</div></td>
                  <td className="p-4 font-bold text-slate-900">Bs. {money(credito.monto_aprobado)}</td>
                  <td className="p-4">{formatDate(credito.fecha_desembolso)}</td>
                  <td className="max-w-56 break-words p-4 font-mono text-[10px] text-slate-600">{credito.resultado_desembolso || 'Sin operación registrada'}</td>
                  <td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${credito.estado_credito === 'VIGENTE' ? 'bg-emerald-50 text-emerald-700' : credito.estado_credito === 'EN_MORA' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{credito.modo_desembolso === 'SIMULACION' ? 'DESEMBOLSADO · SIMULACIÓN' : credito.estado_credito}</span></td>
                </tr>
              )) : <tr><td colSpan="5" className="p-8 text-center text-slate-400">Todavía no hay desembolsos registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>


      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="my-auto flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{modal.tipo === 'firma' ? 'Verificar firma del contrato' : 'Registrar desembolso (CU11)'}</h2>
                <p className="mt-1 text-xs text-slate-500">{modal.credito.numero_credito} · Contrato {modal.credito.numero_contrato}</p>
              </div>
              <button type="button" disabled={procesando} onClick={() => setModal(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </header>
            <div className="space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div><p className="text-xs text-slate-500">Prestatario</p><p className="mt-1 text-sm font-semibold text-slate-900">{modal.credito.cliente}</p></div>
                <div><p className="text-xs text-slate-500">Documento</p><p className="mt-1 text-sm font-semibold text-slate-900">{modal.credito.ci || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Monto aprobado</p><p className="mt-1 text-lg font-bold text-slate-900">Bs. {money(modal.credito.monto_aprobado)}</p></div>
                <div><p className="text-xs text-slate-500">Cronograma</p><p className="mt-1 text-sm font-semibold text-slate-900">{modal.credito.cantidad_cuotas} cuotas</p></div>
              </div>

              {modal.tipo === 'firma' ? (
                <>
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>Esta acción no crea una firma electrónica. Úsela únicamente después de revisar la firma física del prestatario y confirmar que una copia del contrato firmado fue resguardada en el expediente.</p></div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={firmaVerificada} onChange={(event) => setFirmaVerificada(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" /><span>Confirmo que he verificado la firma del contrato y que el documento firmado está resguardado en el expediente.</span></label>
                </>
              ) : (
                <>
                  <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Modo de operación</span><select value={modoDesembolso} onChange={(event) => { setModoDesembolso(event.target.value); setReferenciaExterna(''); setRespuestaCore(null); setDesembolsoConfirmado(false); }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="SIMULACION">Simulación API del Core (desarrollo)</option><option value="REAL">Operación real confirmada externamente</option></select></label>
                  <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Medio de desembolso *</span><select value={medioDesembolso} onChange={(event) => setMedioDesembolso(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="TRANSFERENCIA">Transferencia bancaria</option><option value="ABONO_CUENTA">Abono en cuenta</option><option value="CHEQUE">Cheque</option><option value="EFECTIVO">Efectivo</option><option value="OTRO">Otro medio autorizado</option></select></label>
                  {modoDesembolso === 'SIMULACION' ? (
                    <>
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950"><AlertTriangle className="mr-2 inline h-4 w-4" /><strong>MODO SIMULACIÓN:</strong> esta API genera una respuesta de prueba. No se conecta a un Core real y no ejecuta transferencias ni mueve dinero. El registro resultante quedará identificado como simulado.</div>
                      <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Cuenta destino de prueba (opcional)</span><input value={numeroCuentaDestino} onChange={(event) => setNumeroCuentaDestino(event.target.value)} maxLength={100} placeholder="CUENTA-DEMO-001" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label>
                      <button type="button" onClick={simularCore} disabled={procesando} className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-50"><Send className="h-4 w-4" /> Solicitar respuesta simulada del Core</button>
                      {respuestaCore && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><p className="font-semibold">Respuesta simulada recibida</p><p className="mt-1">Referencia: <span className="font-mono">{respuestaCore.codigo_transaccion_core}</span></p><p>Fecha: {formatDateTime(respuestaCore.fecha_procesamiento)}</p><p>Importe de prueba: Bs. {money(respuestaCore.monto_desembolsado_simulado)}</p><p className="mt-1">{respuestaCore.mensaje}</p></div>}
                      <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Referencia de la simulación</span><input value={referenciaExterna} readOnly maxLength={120} placeholder="Use el botón para generar la referencia" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm" /></label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={desembolsoConfirmado} onChange={(event) => setDesembolsoConfirmado(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" /><span>Confirmo que registraré una simulación académica; no representa un desembolso monetario real.</span></label>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950"><AlertTriangle className="mr-2 inline h-4 w-4" />El sistema no verifica automáticamente un Core real. Registre la operación solo después de confirmar el movimiento en el canal financiero autorizado.</div>
                      <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Número real de operación / comprobante *</span><input value={referenciaExterna} onChange={(event) => setReferenciaExterna(event.target.value)} maxLength={120} placeholder="Referencia emitida por el sistema financiero" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={desembolsoConfirmado} onChange={(event) => setDesembolsoConfirmado(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" /><span>Confirmo que el desembolso real fue ejecutado y verificado fuera de este sistema.</span></label>
                    </>
                  )}
                </>
              )}
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <button type="button" disabled={procesando} onClick={() => setModal(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
              <button type="button" disabled={procesando || (modal.tipo === 'firma' ? !firmaVerificada : (!desembolsoConfirmado || referenciaExterna.trim().length < 4 || (modoDesembolso === 'SIMULACION' && !respuestaCore)))} onClick={modal.tipo === 'firma' ? confirmarFirma : confirmarDesembolso} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-accent,#0ea5e9)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                {procesando ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</> : modal.tipo === 'firma' ? <><ClipboardCheck className="h-4 w-4" /> Registrar verificación</> : modoDesembolso === 'SIMULACION' ? <><Lock className="h-4 w-4" /> Registrar simulación</> : <><Lock className="h-4 w-4" /> Registrar desembolso real</>}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

