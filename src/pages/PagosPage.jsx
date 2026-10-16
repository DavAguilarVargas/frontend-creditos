import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { generarBoletaPagoPDF } from '../utils/pdfGenerator';
import { CreditCard, QrCode, Search, ShieldAlert, CheckCircle2, Calendar, DollarSign, Clock } from 'lucide-react';

export default function PagosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [creditoInfo, setCreditoInfo] = useState(null);
  const [planAmortizacion, setPlanAmortizacion] = useState([]);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  
  const [isModalQROpen, setIsModalQROpen] = useState(false);
  const [metodoPago, setMetodoPago] = useState('QR');
  const [cargando, setCargando] = useState(false);

  // Buscar Crédito y cargar su Plan de Amortización (CU12 - Paso 1 y 2)
  const buscarCredito = async (e) => {
    if (e) e.preventDefault();
    if (!busqueda.trim()) return;

    setCargando(true);
    try {
      const resCredito = await api.get(`/creditos/${busqueda}`);
      const resPlan = await api.get(`/creditos/${busqueda}/amortizacion`);

      setCreditoInfo(resCredito.data);
      setPlanAmortizacion(resPlan.data || []);
      setCuotaSeleccionada(null);
    } catch (err) {
      Swal.fire('Atención', 'No se encontró un crédito activo o registrado con ese número o C.I.', 'warning');
      setCreditoInfo(null);
      setPlanAmortizacion([]);
    } finally {
      setCargando(false);
    }
  };

  // CU13: Controlar Mora (Proceso del Sistema para detectar cuotas vencidas y actualizar estado)
  const ejecutarControlMora = async () => {
    try {
      setCargando(true);
      const res = await api.post('/creditos/control-mora');
      Swal.fire({
        title: 'Control de Mora Ejecutado',
        text: res.data?.mensaje || 'Se han actualizado las cuotas vencidas y los estados de mora.',
        icon: 'info',
      });
      if (busqueda) buscarCredito();
    } catch (err) {
      Swal.fire('Error', 'No se pudo ejecutar el control automático de mora', 'error');
    } finally {
      setCargando(false);
    }
  };

  // CU12: Procesar Registro de Pago
  const handleProcesarPago = async () => {
    if (!cuotaSeleccionada) return;

    try {
      const payloadPago = {
        id_credito: creditoInfo.id_credito,
        id_cuota: cuotaSeleccionada.id_cuota,
        nro_cuota: cuotaSeleccionada.nro_cuota,
        monto_capital: parseFloat(cuotaSeleccionada.monto_capital),
        monto_interes: parseFloat(cuotaSeleccionada.monto_interes),
        monto_mora: parseFloat(cuotaSeleccionada.monto_mora || 0),
        monto_total: parseFloat(cuotaSeleccionada.monto_total),
        metodo_pago: metodoPago,
      };

      const res = await api.post('/pagos', payloadPago);
      setIsModalQROpen(false);

      const nuevoSaldo = Math.max(0, (creditoInfo.saldo_pendiente || 0) - payloadPago.monto_capital);
      const nuevoEstado = nuevoSaldo === 0 ? 'CANCELADO' : creditoInfo.estado;

      const datosComprobante = {
        ...payloadPago,
        id_pago: res.data?.id_pago || Date.now(),
        nombre_cliente: creditoInfo.nombre_cliente,
        ci_cliente: creditoInfo.ci_cliente,
        saldo_restante: nuevoSaldo,
        nuevo_estado_credito: nuevoEstado,
        usuario_cajero: localStorage.getItem('usuario_nombre') || 'Cajero Ventanilla',
      };

      Swal.fire({
        title: '¡Pago Exitoso!',
        text: `La cuota N° ${cuotaSeleccionada.nro_cuota} ha sido cancelada. Nuevo saldo: $${nuevoSaldo.toFixed(2)}`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Descargar Boleta PDF',
        cancelButtonText: 'Continuar',
      }).then((result) => {
        if (result.isConfirmed) {
          generarBoletaPagoPDF(datosComprobante);
        }
        buscarCredito();
      });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Ocurrió un error al registrar el pago', 'error');
    }
  };

  const getBadgeEstadoCuota = (estado) => {
    switch (estado) {
      case 'PAGADA': return <Badge variant="success">PAGADA</Badge>;
      case 'VENCIDA':
      case 'EN_MORA': return <Badge variant="danger">VENCIDA / MORA</Badge>;
      default: return <Badge variant="warning">PENDIENTE</Badge>;
    }
  };

  const cadenaQR = cuotaSeleccionada
    ? `BCB|INF241|CREDITO#${creditoInfo?.id_credito}|CUOTA:${cuotaSeleccionada.nro_cuota}|MONTO:${cuotaSeleccionada.monto_total}|BOB`
    : '';

  return (
    <div className="space-y-6">
      {/* Encabezado y Ejecución CU13 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Módulo de Cobranzas y Control de Mora (CU12 / CU13)</h3>
          <p className="text-xs text-slate-500">Gestión de amortización, cobros en ventanilla/QR e identificación de mora</p>
        </div>
        
        <button
          onClick={ejecutarControlMora}
          className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" /> Ejecutar Control de Mora (CU13)
        </button>
      </div>

      {/* Buscador de Crédito */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl mx-auto">
        <form onSubmit={buscarCredito} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase">
            Buscar por Nro. de Crédito o C.I. del Cliente *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Ej. 1001 o 1234567"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={cargando}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 shadow"
            >
              <Search className="w-4 h-4" /> {cargando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>
      </div>

      {/* Detalle del Crédito y Tabla de Amortización */}
      {creditoInfo && (
        <div className="space-y-6">
          {/* Ficha Resumen del Crédito */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-slate-400 block font-semibold uppercase">Cliente</span>
              <span className="text-sm font-bold text-slate-800">{creditoInfo.nombre_cliente}</span>
              <span className="text-xs text-slate-500 block">CI: {creditoInfo.ci_cliente}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold uppercase">Monto Concedido</span>
              <span className="text-sm font-bold text-slate-800">${creditoInfo.monto_concedido}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold uppercase">Saldo Exigible (RN07)</span>
              <span className="text-sm font-bold text-emerald-600">${creditoInfo.saldo_pendiente || '0.00'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold uppercase">Estado Actual</span>
              <Badge variant={creditoInfo.estado === 'EN_MORA' ? 'danger' : creditoInfo.estado === 'CANCELADO' ? 'neutral' : 'success'}>
                {creditoInfo.estado}
              </Badge>
            </div>
          </div>

          {/* Tabla de Amortización */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" /> Plan de Amortización y Cronograma de Pagos
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs">
                    <th className="p-3">N° Cuota</th>
                    <th className="p-3">Vencimiento</th>
                    <th className="p-3">Capital ($)</th>
                    <th className="p-3">Interés ($)</th>
                    <th className="p-3">Mora ($)</th>
                    <th className="p-3">Total Cuota ($)</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {planAmortizacion.map((cuota) => (
                    <tr key={cuota.id_cuota} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">Cuota #{cuota.nro_cuota}</td>
                      <td className="p-3 text-xs">{cuota.fecha_vencimiento}</td>
                      <td className="p-3">${cuota.monto_capital}</td>
                      <td className="p-3">${cuota.monto_interes}</td>
                      <td className="p-3 text-rose-600 font-semibold">${cuota.monto_mora || '0.00'}</td>
                      <td className="p-3 font-bold text-slate-900">${cuota.monto_total}</td>
                      <td className="p-3 text-center">{getBadgeEstadoCuota(cuota.estado)}</td>
                      <td className="p-3 text-center">
                        {cuota.estado !== 'PAGADA' ? (
                          <button
                            onClick={() => {
                              setCuotaSeleccionada(cuota);
                              setMetodoPago('QR');
                              setIsModalQROpen(true);
                            }}
                            className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded shadow-sm transition"
                          >
                            Pagar
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Saldada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pago e Integración QR / Efectivo */}
      <Modal
        isOpen={isModalQROpen}
        onClose={() => setIsModalQROpen(false)}
        title={`Cobro de Cuota N° ${cuotaSeleccionada?.nro_cuota} - Crédito #${creditoInfo?.id_credito}`}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Abono a Capital:</span>
              <span className="font-semibold">${cuotaSeleccionada?.monto_capital}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Interés Corriente:</span>
              <span className="font-semibold">${cuotaSeleccionada?.monto_interes}</span>
            </div>
            {parseFloat(cuotaSeleccionada?.monto_mora || 0) > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Recargo por Mora:</span>
                <span>+${cuotaSeleccionada?.monto_mora}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1 text-slate-900">
              <span>Monto Total a Cancelar:</span>
              <span className="text-sky-700">${cuotaSeleccionada?.monto_total}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Seleccionar Método de Pago</label>
            <select
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="QR">Pago mediante Código QR Interoperable</option>
              <option value="EFECTIVO">Efectivo en Ventanilla</option>
              <option value="TRANSFERENCIA">Transferencia Bancaria Directa</option>
            </select>
          </div>

          {metodoPago === 'QR' ? (
            <div className="flex flex-col items-center justify-center p-3 bg-white border rounded-xl space-y-2">
              <QRCodeSVG value={cadenaQR} size={170} includeMargin={true} />
              <p className="text-xs text-slate-400 text-center">Escanee el código QR desde la app de su entidad financiera</p>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800">
              Verifique haber recibido el dinero en efectivo por el monto exacto de <strong>${cuotaSeleccionada?.monto_total} BOB</strong> antes de confirmar.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalQROpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleProcesarPago}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow"
            >
              Confirmar y Registrar Pago
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}