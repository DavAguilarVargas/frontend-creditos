import React, { useState, useEffect } from 'react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import { FileCheck, Check, X, Send } from 'lucide-react';

export default function CreditosPage() {
  const [solicitudes, setSolicitudes] = useState([]);

  const cargarSolicitudes = async () => {
    try {
      const res = await api.get('/solicitudes');
      setSolicitudes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  // CU07, CU09, CU10: Aprobar Solicitud, Generar Contrato y Cronograma Automático
  const handleAprobar = async (idSolicitud) => {
    try {
      await api.post('/creditos/aprobar', { id_solicitud: idSolicitud });
      Swal.fire('Aprobado', 'Solicitud aprobada. Contrato y cronograma generados exitosamente.', 'success');
      cargarSolicitudes();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'No posee atribuciones para aprobar', 'error');
    }
  };

  // CU08: Rechazar con Motivo Obligatorio (RN11)
  const handleRechazar = async (idSolicitud) => {
    const { value: motivo } = await Swal.fire({
      title: 'Rechazar Crédito',
      input: 'textarea',
      inputLabel: 'Ingrese el motivo del rechazo (RN11)',
      inputPlaceholder: 'Ej. Capacidad de pago insuficiente...',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return '¡El motivo del rechazo es obligatorio!';
      }
    });

    if (motivo) {
      try {
        await api.post('/creditos/rechazar', { id_solicitud: idSolicitud, motivo_rechazo: motivo });
        Swal.fire('Rechazado', 'La solicitud ha sido rechazada.', 'info');
        cargarSolicitudes();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.error || 'Error al procesar el rechazo', 'error');
      }
    }
  };

  // CU11: Desembolsar mediante integración con Core Bancario
  const handleDesembolsar = async (idCredito, monto) => {
    try {
      // 1. Invocar Core Bancario
      const resCore = await api.post('/integraciones/core/desembolsar', {
        id_credito: idCredito,
        monto: monto
      });

      // 2. Marcar Crédito como VIGENTE
      await api.post('/creditos/desembolsar', { id_credito: idCredito });

      Swal.fire(
        'Desembolso Exitoso',
        `Operación confirmada por el Core Bancario (${resCore.data.codigo_transaccion_core}). Crédito ahora VIGENTE.`,
        'success'
      );
      cargarSolicitudes();
    } catch (err) {
      Swal.fire('Error', 'Error al ejecutar desembolso en el Core', 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-sky-600" /> Control de Aprobaciones y Desembolsos
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs">
              <th className="p-4">ID</th>
              <th className="p-4">Monto Solicitado</th>
              <th className="p-4">Plazo</th>
              <th className="p-4">Estado Solicitud</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {solicitudes.map((s) => (
              <tr key={s.id_solicitud} className="hover:bg-slate-50">
                <td className="p-4 font-semibold">#{s.id_solicitud}</td>
                <td className="p-4">${s.monto_solicitado}</td>
                <td className="p-4">{s.plazo_meses} meses</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    s.estado === 'APROBADA' ? 'bg-emerald-100 text-emerald-800' :
                    s.estado === 'RECHAZADA' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {s.estado}
                  </span>
                </td>
                <td className="p-4 flex justify-center gap-2">
                  {s.estado === 'REGISTRADA' || s.estado === 'EN_EVALUACION' ? (
                    <>
                      <button
                        onClick={() => handleAprobar(s.id_solicitud)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Aprobar (CU07)
                      </button>
                      <button
                        onClick={() => handleRechazar(s.id_solicitud)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Rechazar (CU08)
                      </button>
                    </>
                  ) : s.estado === 'APROBADA' ? (
                    <button
                      onClick={() => handleDesembolsar(s.id_credito || s.id_solicitud, s.monto_solicitado)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-medium flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" /> Desembolsar Core (CU11)
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Procesado</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}