import React, { useState } from 'react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import { DollarSign, AlertTriangle, Receipt } from 'lucide-react';

export default function PagosPage() {
  const [idCredito, setIdCredito] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [comprobante, setComprobante] = useState(null);

  // CU12: Registrar Pago
  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/pagos', {
        id_credito: parseInt(idCredito),
        monto: parseFloat(montoPago)
      });

      setComprobante(res.data);
      Swal.fire('Pago Exitoso', 'Pago registrado y comprobante emitido.', 'success');
      setMontoPago('');
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Error al procesar el pago', 'error');
    }
  };

  // CU13: Ejecutar Control Automático de Mora
  const handleEjecutarControlMora = async () => {
    try {
      const res = await api.post('/mora/actualizar');
      Swal.fire('Control de Mora Executado', res.data.mensaje || 'Cuotas vencidas actualizadas.', 'info');
    } catch (err) {
      Swal.fire('Error', 'Error al ejecutar control de mora', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Formulario Registro de Pago */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" /> Registro de Pago de Cuotas (CU12)
        </h3>

        <form onSubmit={handleRegistrarPago} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">ID o Número de Crédito</label>
            <input
              type="number"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              placeholder="Ej. 1"
              value={idCredito}
              onChange={(e) => setIdCredito(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Monto a Cancelar ($)</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              placeholder="0.00"
              value={montoPago}
              onChange={(e) => setMontoPago(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow transition"
          >
            Registrar Pago y Emitir Comprobante
          </button>
        </form>
      </div>

      {/* Control Automático de Mora (CU13) & Comprobante */}
      <div className="space-y-6">
        <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
          <h4 className="font-bold text-amber-900 text-base flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> Rutina de Control de Mora (CU13)
          </h4>
          <p className="text-xs text-amber-700 mb-4">
            Detecta automáticamente cuotas vencidas cuya fecha de pago expiró y actualiza el estado del crédito a EN_MORA.
          </p>
          <button
            onClick={handleEjecutarControlMora}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow"
          >
            Ejecutar Verificación de Mora
          </button>
        </div>

        {comprobante && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-sky-600" /> Comprobante Emitido
            </h4>
            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded">
              <p><span className="font-semibold">Nro Recibo:</span> {comprobante.numero_comprobante || 'REC-1001'}</p>
              <p><span className="font-semibold">Monto Pagado:</span> ${comprobante.monto_pagado}</p>
              <p><span className="font-semibold">Nuevo Saldo Capital:</span> ${comprobante.nuevo_saldo_capital}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}