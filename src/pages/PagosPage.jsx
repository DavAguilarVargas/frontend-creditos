import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { generarBoletaPagoPDF } from '../utils/pdfGenerator';
import { useConfiguracionInstitucion } from '../context/ConfiguracionInstitucionContext';
import {
  CreditCard, QrCode, Search, ShieldAlert, CheckCircle2, Calendar,
  DollarSign, Clock, RefreshCw, AlertTriangle, ReceiptText
} from 'lucide-react';

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo en ventanilla' },
  { value: 'QR', label: 'QR (verificación externa manual)' },
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria (verificación manual)' },
];

const money = (value) => Number(value || 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (value) => {
  if (!value) return '—';
  const text = String(value).slice(0, 10);
  const parts = text.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : text;
};

const errorMessage = (error, fallback) =>
  error?.response?.data?.error || error?.response?.data?.mensaje || fallback;

export default function PagosPage() {
  const { configuracion } = useConfiguracionInstitucion();
  const [busqueda, setBusqueda] = useState('');
  const [creditoInfo, setCreditoInfo] = useState(null);
  const [creditosCoincidentes, setCreditosCoincidentes] = useState([]);
  const [ultimoComprobante, setUltimoComprobante] = useState(null);
  const [planAmortizacion, setPlanAmortizacion] = useState([]);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [isModalQROpen, setIsModalQROpen] = useState(false);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [referenciaExterna, setReferenciaExterna] = useState('');
  const [confirmoRecepcion, setConfirmoRecepcion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [procesandoMora, setProcesandoMora] = useState(false);

  const cargarCredito = async (identificador) => {
    const valor = String(identificador || '').trim();
    if (!valor) return;

    const response = await api.get(`/pagos/buscar/${encodeURIComponent(valor)}`);
    const data = response.data || {};

    if (data.requiere_seleccion) {
      setCreditoInfo(null);
      setPlanAmortizacion([]);
      setCuotaSeleccionada(null);
      setCreditosCoincidentes(Array.isArray(data.creditos) ? data.creditos : []);
      return;
    }

    setCreditosCoincidentes([]);
    setCreditoInfo(data.credito || null);
    setPlanAmortizacion(Array.isArray(data.cuotas) ? data.cuotas : []);
    setCuotaSeleccionada(null);
  };

  const seleccionarCredito = async (numeroCredito) => {
    setBusqueda(String(numeroCredito));
    setCargando(true);
    try {
      await cargarCredito(numeroCredito);
    } catch (error) {
      await Swal.fire('No se pudo consultar', errorMessage(error, 'No fue posible cargar el crédito seleccionado.'), 'warning');
    } finally {
      setCargando(false);
    }
  };

  const buscarCredito = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    if (!busqueda.trim()) return;

    setCargando(true);
    try {
      await cargarCredito(busqueda);
    } catch (error) {
      const message = errorMessage(error, 'No fue posible consultar el crédito.');
      await Swal.fire('No se pudo consultar', message, 'warning');
      setCreditoInfo(null);
      setCreditosCoincidentes([]);
      setPlanAmortizacion([]);
      setCuotaSeleccionada(null);
    } finally {
      setCargando(false);
    }
  };

  const ejecutarControlMora = async () => {
    setProcesandoMora(true);
    try {
      const response = await api.post('/pagos/control-mora');
      const data = response.data || {};
      await Swal.fire({
        title: 'Control de mora completado',
        html: `<div style="text-align:left"><p>${data.mensaje || 'Se revisaron los vencimientos.'}</p><p style="margin-top:10px">Cuotas marcadas vencidas: <b>${Number(data.cuotas_marcadas_vencidas || 0)}</b></p><p>Créditos cambiados a EN_MORA: <b>${Number(data.creditos_cambiados_a_mora || 0)}</b></p><p>Créditos reactivados a VIGENTE: <b>${Number(data.creditos_reactivados || 0)}</b></p><p style="margin-top:10px;font-size:12px;color:#64748b">No se recalcularon penalidades. El proceso solo actualiza estados según CU13.</p></div>`,
        icon: 'success',
      });
      if (busqueda.trim()) {
        try { await cargarCredito(busqueda); } catch { /* La operación ya se completó; no ocultar el resultado de CU13. */ }
      }
    } catch (error) {
      await Swal.fire('Error en control de mora', errorMessage(error, 'No se pudo ejecutar el control de mora.'), 'error');
    } finally {
      setProcesandoMora(false);
    }
  };

  const abrirPago = (cuota) => {
    setCuotaSeleccionada(cuota);
    setMetodoPago('EFECTIVO');
    setReferenciaExterna('');
    setConfirmoRecepcion(false);
    setIsModalQROpen(true);
  };

  const handleProcesarPago = async () => {
    if (!cuotaSeleccionada || procesandoPago) return;
    if (!confirmoRecepcion) {
      await Swal.fire('Confirmación requerida', 'Confirme que recibió el efectivo o que verificó el movimiento en el canal externo.', 'warning');
      return;
    }
    if (['QR', 'TRANSFERENCIA'].includes(metodoPago) && referenciaExterna.trim().length < 4) {
      await Swal.fire('Referencia requerida', 'Ingrese la referencia real emitida por la entidad financiera después de comprobar la operación.', 'warning');
      return;
    }

    setProcesandoPago(true);
    let data;
    try {
      const payload = {
        id_cuota: cuotaSeleccionada.id_cuota,
        monto_pagado: String(cuotaSeleccionada.monto_total),
        metodo_pago: metodoPago,
        referencia_externa: referenciaExterna.trim() || null,
        confirmar_recepcion: true,
      };
      const response = await api.post('/pagos', payload);
      data = response.data || {};
    } catch (error) {
      // Este catch cubre exclusivamente el registro en el servidor. Si falla el PDF
      // después, nunca se debe decir erróneamente que el pago no fue registrado.
      await Swal.fire('No se pudo registrar el pago', errorMessage(error, 'La operación no fue confirmada.'), 'error');
      setProcesandoPago(false);
      return;
    }

    setIsModalQROpen(false);
    const datosComprobante = {
      ...data,
      ...(data.cuota || {}),
      ...(data.credito || {}),
      id_pago: data.id_pago,
      numero_recibo: data.numero_recibo || data.nro_transaccion,
      nro_transaccion: data.nro_transaccion,
      referencia_externa: data.referencia_externa,
      id_credito: creditoInfo.id_credito,
      numero_credito: data.credito?.numero_credito || creditoInfo.numero_credito,
      nombre_cliente: creditoInfo.nombre_cliente,
      ci_cliente: creditoInfo.ci_cliente,
      saldo_restante: data.credito?.saldo_pendiente ?? creditoInfo.saldo_pendiente,
      nuevo_estado_credito: data.credito?.estado || creditoInfo.estado,
      usuario_cajero: data.nombre_cajero || 'Cajero autorizado',
      metodo_pago: data.metodo_pago || metodoPago,
      monto_total: data.monto_pagado,
      fecha_pago: data.fecha_pago_local || data.fecha_pago,
      fecha_pago_local: data.fecha_pago_local || null,
      nro_cuota: data.cuota?.nro_cuota ?? cuotaSeleccionada.nro_cuota,
      monto_capital: data.cuota?.monto_capital ?? cuotaSeleccionada.monto_capital,
      monto_interes: data.cuota?.monto_interes ?? cuotaSeleccionada.monto_interes,
      monto_mora: data.cuota?.monto_mora ?? cuotaSeleccionada.monto_mora,
      institucion: configuracion,
    };
    setUltimoComprobante(datosComprobante);

    try {
      const result = await Swal.fire({
        title: 'Pago registrado correctamente',
        html: `Se registró el pago de la cuota <b>N.º ${datosComprobante.nro_cuota}</b>.<br/>Crédito: <b>${datosComprobante.numero_credito}</b><br/>Recibo: <b>${data.nro_transaccion}</b><br/>Saldo de capital: <b>${configuracion?.moneda_base || 'BOB'} ${money(data.credito?.saldo_pendiente)}</b>`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Descargar 2 copias PDF',
        cancelButtonText: 'Continuar',
      });

      if (result.isConfirmed) {
        try {
          await generarBoletaPagoPDF(datosComprobante);
        } catch (pdfError) {
          console.error('Pago registrado, pero falló la generación del PDF:', pdfError);
          await Swal.fire(
            'El pago se registró; el PDF falló',
            `El pago ${data.nro_transaccion} quedó registrado. No vuelva a cobrarlo. Use “Descargar último comprobante” para intentarlo nuevamente.`,
            'warning'
          );
        }
      }
    } catch (dialogError) {
      console.error('No fue posible mostrar la confirmación del pago:', dialogError);
    }

    try {
      await cargarCredito(busqueda);
    } catch (refreshError) {
      console.error('El pago está registrado, pero no se refrescó el cronograma:', refreshError);
      await Swal.fire(
        'Pago registrado',
        `El pago ${data.nro_transaccion} quedó registrado, pero no se pudo actualizar la vista. Vuelva a buscar el crédito.`,
        'info'
      );
    } finally {
      setProcesandoPago(false);
    }
  };

  const descargarUltimoComprobante = async () => {
    if (!ultimoComprobante) return;
    try {
      await generarBoletaPagoPDF(ultimoComprobante);
    } catch (error) {
      console.error('Error generando comprobante duplicado:', error);
      await Swal.fire('No se pudo generar el PDF', 'El pago ya está registrado; el error solo afecta al archivo PDF. Revise la consola y vuelva a intentarlo.', 'warning');
    }
  };

  const getBadgeEstadoCuota = (estado) => {
    switch (estado) {
      case 'PAGADA': return <Badge variant="success">PAGADA</Badge>;
      case 'VENCIDA': return <Badge variant="danger">VENCIDA</Badge>;
      default: return <Badge variant="warning">PENDIENTE</Badge>;
    }
  };

  const cadenaQR = cuotaSeleccionada
    ? `REFERENCIA-INTERNA|CREDITO:${creditoInfo?.numero_credito || creditoInfo?.id_credito}|CUOTA:${cuotaSeleccionada.nro_cuota}|MONTO:${cuotaSeleccionada.monto_total}|MONEDA:BOB`
    : '';

  const creditoPuedeCobrar = ['VIGENTE', 'EN_MORA'].includes(creditoInfo?.estado);
  const moneda = configuracion?.moneda_base || 'BOB';

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <CreditCard className="h-5 w-5 text-sky-600" /> Cobranzas y control de mora (CU12 / CU13)
          </h3>
          <p className="mt-1 text-xs text-slate-500">Registro transaccional de pagos y detección de vencimientos. En producción, CU13 se ejecuta diariamente mediante un Render Cron Job; este botón permite comprobarlo manualmente.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ultimoComprobante && (
            <button
              type="button"
              onClick={descargarUltimoComprobante}
              className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
            >
              <ReceiptText className="h-4 w-4" /> Descargar último comprobante
            </button>
          )}
          <button
            onClick={ejecutarControlMora}
            disabled={procesandoMora}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
          >
            <ShieldAlert className="h-4 w-4" /> {procesandoMora ? 'Procesando mora...' : 'Ejecutar control ahora'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={buscarCredito} className="space-y-3">
          <label className="block text-xs font-semibold uppercase text-slate-700">Buscar por número de crédito o CI *</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Número de crédito o CI del cliente"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button type="submit" disabled={cargando} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700 disabled:opacity-60">
              <Search className="h-4 w-4" /> {cargando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          <p className="text-xs text-slate-500">Si una CI corresponde a varios créditos, busque por el número exacto del crédito.</p>
        </form>
      </div>

      {creditosCoincidentes.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-bold text-slate-800">Créditos encontrados para la CI ingresada</h4>
            <p className="mt-1 text-xs text-slate-500">Seleccione el número exacto del crédito que desea cobrar.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500"><tr>
                <th className="p-3">Crédito</th><th className="p-3">Cliente</th><th className="p-3">Destino</th><th className="p-3">Saldo capital</th><th className="p-3">Estado</th><th className="p-3 text-right">Acción</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {creditosCoincidentes.map((item) => (
                  <tr key={item.id_credito}>
                    <td className="p-3 font-semibold text-slate-900">{item.numero_credito}</td>
                    <td className="p-3">{item.nombre_cliente}<span className="block text-xs text-slate-500">CI: {item.ci_cliente}</span></td>
                    <td className="p-3">{item.destino_credito || '—'}</td>
                    <td className="whitespace-nowrap p-3">{moneda} {money(item.saldo_pendiente)}</td>
                    <td className="p-3"><Badge variant={item.estado === 'EN_MORA' ? 'danger' : item.estado === 'CANCELADO' ? 'neutral' : 'success'}>{item.estado}</Badge></td>
                    <td className="p-3 text-right"><button type="button" disabled={cargando} onClick={() => seleccionarCredito(item.numero_credito)} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50">Seleccionar crédito</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {creditoInfo && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
            <div><span className="block text-xs font-semibold uppercase text-slate-400">Cliente</span><span className="text-sm font-bold text-slate-800">{creditoInfo.nombre_cliente}</span><span className="block text-xs text-slate-500">CI: {creditoInfo.ci_cliente}</span></div>
            <div><span className="block text-xs font-semibold uppercase text-slate-400">Número de crédito</span><span className="text-sm font-bold text-slate-800">{creditoInfo.numero_credito}</span></div>
            <div><span className="block text-xs font-semibold uppercase text-slate-400">Monto concedido</span><span className="text-sm font-bold text-slate-800">{moneda} {money(creditoInfo.monto_concedido)}</span></div>
            <div><span className="block text-xs font-semibold uppercase text-slate-400">Saldo de capital</span><span className="text-sm font-bold text-emerald-700">{moneda} {money(creditoInfo.saldo_pendiente)}</span></div>
            <div><span className="block text-xs font-semibold uppercase text-slate-400">Estado del crédito</span><Badge variant={creditoInfo.estado === 'EN_MORA' ? 'danger' : creditoInfo.estado === 'CANCELADO' ? 'neutral' : 'success'}>{creditoInfo.estado}</Badge></div>
          </div>

          {!creditoPuedeCobrar && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Solo se pueden registrar pagos cuando el crédito está en estado VIGENTE o EN_MORA.
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Calendar className="h-4 w-4 text-sky-600" /> Cronograma y pagos pendientes</h4>
              <span className="text-xs text-slate-500">{planAmortizacion.length} cuotas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                  <th className="p-3">N.º cuota</th><th className="p-3">Vencimiento</th><th className="p-3">Capital</th><th className="p-3">Interés</th><th className="p-3">Penalidad</th><th className="p-3">Total exigible</th><th className="p-3">Estado</th><th className="p-3 text-center">Acción</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {planAmortizacion.length ? planAmortizacion.map((cuota) => {
                    const puedePagar = creditoPuedeCobrar && ['PENDIENTE', 'VENCIDA'].includes(cuota.estado) && Number(cuota.numero_pagos || 0) === 0;
                    return <tr key={cuota.id_cuota} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{cuota.nro_cuota}</td>
                      <td className="whitespace-nowrap p-3 text-xs">{formatDate(cuota.fecha_vencimiento)}</td>
                      <td className="whitespace-nowrap p-3">{moneda} {money(cuota.monto_capital)}</td>
                      <td className="whitespace-nowrap p-3">{moneda} {money(cuota.monto_interes)}</td>
                      <td className="whitespace-nowrap p-3 font-semibold text-rose-600">{moneda} {money(cuota.monto_mora)}</td>
                      <td className="whitespace-nowrap p-3 font-bold text-slate-900">{moneda} {money(cuota.monto_total)}</td>
                      <td className="p-3">{getBadgeEstadoCuota(cuota.estado)}{Number(cuota.numero_pagos || 0) > 0 && cuota.estado !== 'PAGADA' ? <span className="mt-1 block max-w-32 text-[10px] text-amber-700">Pago previo: conciliar</span> : null}</td>
                      <td className="p-3 text-center">{cuota.estado === 'PAGADA'
                        ? <span className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Saldada</span>
                        : Number(cuota.numero_pagos || 0) > 0
                          ? <span className="text-xs text-amber-700">Conciliar</span>
                          : <button disabled={!puedePagar} onClick={() => abrirPago(cuota)} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40">Registrar pago</button>}
                      </td>
                    </tr>;
                  }) : <tr><td colSpan="8" className="p-8 text-center text-sm text-slate-400">Este crédito no tiene cuotas registradas.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalQROpen}
        onClose={() => { if (!procesandoPago) setIsModalQROpen(false); }}
        title={`Registrar pago · Cuota N.º ${cuotaSeleccionada?.nro_cuota || ''}`}
      >
        {cuotaSeleccionada && <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Capital</span><b>{moneda} {money(cuotaSeleccionada.monto_capital)}</b></div>
            <div className="mt-1 flex justify-between gap-3"><span className="text-slate-500">Interés corriente</span><b>{moneda} {money(cuotaSeleccionada.monto_interes)}</b></div>
            <div className="mt-1 flex justify-between gap-3"><span className="text-slate-500">Penalidad registrada</span><b>{moneda} {money(cuotaSeleccionada.monto_mora)}</b></div>
            <div className="mt-2 flex justify-between gap-3 border-t border-slate-200 pt-2 text-sm"><span className="font-bold text-slate-800">Total exigible de la cuota</span><b className="text-sky-700">{moneda} {money(cuotaSeleccionada.monto_total)}</b></div>
            <p className="mt-2 text-[11px] text-slate-500">Esta versión cobra la cuota completa; no admite abonos parciales ni pagos excedentes.</p>
          </div>

          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-slate-700">Método de pago</span>
            <select className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm" value={metodoPago} onChange={(event) => { setMetodoPago(event.target.value); setReferenciaExterna(''); setConfirmoRecepcion(false); }}>
              {METODOS_PAGO.map((metodo) => <option key={metodo.value} value={metodo.value}>{metodo.label}</option>)}
            </select>
          </label>

          {metodoPago === 'QR' && <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2 text-xs text-amber-950"><QrCode className="mt-0.5 h-4 w-4 shrink-0" /><div><b>QR informativo, no interoperable.</b><p className="mt-1">Este código solo identifica el crédito y la cuota. No inicia una transferencia ni confirma el pago. Verifique la operación en la aplicación de su entidad financiera por un canal autorizado.</p></div></div>
            <div className="flex justify-center rounded-lg bg-white p-3"><QRCodeSVG value={cadenaQR} size={150} includeMargin /></div>
          </div>}

          {['QR', 'TRANSFERENCIA'].includes(metodoPago) && <label className="block"><span className="mb-1 block text-xs font-semibold uppercase text-slate-700">Referencia externa real *</span><input value={referenciaExterna} onChange={(event) => setReferenciaExterna(event.target.value)} maxLength={100} required placeholder="Código de operación del canal financiero" className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500" /></label>}

          {metodoPago === 'EFECTIVO' && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">Registre el pago únicamente después de recibir y verificar el efectivo por el importe exacto.</div>}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-xs text-slate-700"><input type="checkbox" checked={confirmoRecepcion} onChange={(event) => setConfirmoRecepcion(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" /><span>Confirmo que recibí el efectivo o verifiqué el pago en el canal autorizado. Entiendo que el sistema no confirma automáticamente pagos QR ni transferencias.</span></label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button type="button" disabled={procesandoPago} onClick={() => setIsModalQROpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={procesandoPago || !confirmoRecepcion || (['QR', 'TRANSFERENCIA'].includes(metodoPago) && referenciaExterna.trim().length < 4)} onClick={handleProcesarPago} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              {procesandoPago ? <><RefreshCw className="h-4 w-4 animate-spin" /> Procesando...</> : <><ReceiptText className="h-4 w-4" /> Confirmar pago recibido</>}
            </button>
          </div>
        </div>}
      </Modal>
    </div>
  );
}