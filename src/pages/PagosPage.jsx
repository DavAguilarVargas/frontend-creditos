import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { generarBoletaPagoPDF } from '../utils/pdfGenerator';
import { CreditCard, QrCode, Printer, Search, CheckCircle2 } from 'lucide-react';

export default function PagosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [creditoEncontrado, setCreditoEncontrado] = useState(null);
  const [isModalQROpen, setIsModalQROpen] = useState(false);
  const [cargando, setCargando] = useState(false);

  const [formPago, setFormPago] = useState({
    monto_total: '',
    metodo_pago: 'QR',
  });

  const buscarCredito = async (e) => {
    e.preventDefault();
    if (!busqueda.trim()) return;

    setCargando(true);
    try {
      const res = await api.get(`/creditos/${busqueda}`);
      setCreditoEncontrado(res.data);
      setFormPago((prev) => ({ ...prev, monto_total: res.data.monto_cuota_actual || '150.00' }));
    } catch (err) {
      Swal.fire('No Encontrado', 'No se encontró un crédito activo con ese número o CI', 'warning');
      setCreditoEncontrado(null);
    } finally {
      setCargando(false);
    }
  };

  const handleProcesarPago = async () => {
    try {
      const datosPago = {
        id_credito: creditoEncontrado?.id_credito || busqueda,
        nombre_cliente: creditoEncontrado?.nombre_cliente || 'Juan Pérez',
        ci_cliente: creditoEncontrado?.ci_cliente || '1234567 LP',
        nro_cuota: creditoEncontrado?.cuota_siguiente || 1,
        monto_capital: (parseFloat(formPago.monto_total) * 0.8).toFixed(2),
        monto_interes: (parseFloat(formPago.monto_total) * 0.2).toFixed(2),
        monto_mora: '0.00',
        monto_total: formPago.monto_total,
        metodo_pago: formPago.metodo_pago,
      };

      // Registrar pago en el backend
      await api.post('/pagos', datosPago);

      setIsModalQROpen(false);
      Swal.fire({
        title: '¡Pago Registrado!',
        text: 'El abono ha sido procesado correctamente.',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Descargar Boleta PDF',
        cancelButtonText: 'Cerrar',
      }).then((result) => {
        if (result.isConfirmed) {
          generarBoletaPagoPDF(datosPago);
        }
      });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'No se pudo procesar el pago', 'error');
    }
  };

  // Cadena simulada para generar la imagen del Código QR interoperable
  const cadenaQR = `BCB|INF241|CREDITO#${busqueda}|MONTO:${formPago.monto_total}|MONEDA:BOB`;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 text-lg">Módulo de Cobranzas y Recepción de Pagos</h3>
        <p className="text-xs text-slate-500">Registro de cuotas en efectivo o transferencias vía QR</p>
      </div>

      {/* Buscador de Crédito */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl mx-auto">
        <form onSubmit={buscarCredito} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase">
            Ingresa Nro. de Crédito o C.I. del Cliente
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

      {/* Formulario de Pago cuando se encuentra un Crédito */}
      {creditoEncontrado && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-bold text-slate-900">{creditoEncontrado.nombre_cliente}</h4>
              <p className="text-xs text-slate-500">CI: {creditoEncontrado.ci_cliente} | Crédito #{creditoEncontrado.id_credito}</p>
            </div>
            <Badge variant="success">AL DÍA</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Monto a Cancelar ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
                value={formPago.monto_total}
                onChange={(e) => setFormPago({ ...formPago, monto_total: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Forma de Pago</label>
              <select
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                value={formPago.metodo_pago}
                onChange={(e) => setFormPago({ ...formPago, metodo_pago: e.target.value })}
              >
                <option value="QR">Pago con Código QR</option>
                <option value="EFECTIVO">Efectivo en Ventanilla</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria Directa</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            {formPago.metodo_pago === 'QR' ? (
              <button
                type="button"
                onClick={() => setIsModalQROpen(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow"
              >
                <QrCode className="w-5 h-5" /> Generar Código QR de Cobro
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProcesarPago}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow"
              >
                <CheckCircle2 className="w-5 h-5" /> Registrar Pago Directo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal QR */}
      <Modal
        isOpen={isModalQROpen}
        onClose={() => setIsModalQROpen(false)}
        title="Cobro mediante Código QR"
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-inner">
            <QRCodeSVG value={cadenaQR} size={200} includeMargin={true} />
          </div>
          <p className="text-sm font-semibold text-slate-700">Monto: ${formPago.monto_total} BOB</p>
          <p className="text-xs text-slate-400 text-center">Escanee este código desde cualquier aplicación de banca móvil</p>

          <button
            onClick={handleProcesarPago}
            className="w-full mt-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow transition"
          >
            Confirmar Recepción del Pago
          </button>
        </div>
      </Modal>
    </div>
  );
}