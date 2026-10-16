import React, { useState, useEffect } from 'react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { FileText, Plus, Calculator, Search, UserCheck } from 'lucide-react';

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formSolicitud, setFormSolicitud] = useState({
    id_cliente: '',
    tipo_credito: 'CONSUMO',
    monto_solicitado: '',
    plazo_meses: '12',
    tasa_interes_anual: '14.5'
  });

  const cargarDatos = async () => {
    try {
      const [resSol, resCli] = await Promise.all([
        api.get('/solicitudes'),
        api.get('/clientes')
      ]);
      setSolicitudes(resSol.data);
      setClientes(resCli.data);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Simulación en tiempo real de cuota fija estimada (Fórmula de Anualidad)
  const calcularCuotaEstimada = () => {
    const P = parseFloat(formSolicitud.monto_solicitado);
    const n = parseInt(formSolicitud.plazo_meses);
    const r = parseFloat(formSolicitud.tasa_interes_anual) / 100 / 12;

    if (!P || !n || !r || P <= 0 || n <= 0) return 0;
    const cuota = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return cuota.toFixed(2);
  };

  const handleCrearSolicitud = async (e) => {
    e.preventDefault();
    if (!formSolicitud.id_cliente) {
      return Swal.fire('Atención', 'Debe seleccionar un cliente existente', 'warning');
    }

    try {
      await api.post('/solicitudes', {
        id_cliente: parseInt(formSolicitud.id_cliente),
        tipo_credito: formSolicitud.tipo_credito,
        monto_solicitado: parseFloat(formSolicitud.monto_solicitado),
        plazo_meses: parseInt(formSolicitud.plazo_meses),
        tasa_interes_anual: parseFloat(formSolicitud.tasa_interes_anual)
      });

      Swal.fire('Solicitud Creada', 'La solicitud de crédito ha sido registrada en estado REGISTRADA', 'success');
      setIsModalOpen(false);
      setFormSolicitud({
        id_cliente: '',
        tipo_credito: 'CONSUMO',
        monto_solicitado: '',
        plazo_meses: '12',
        tasa_interes_anual: '14.5'
      });
      cargarDatos();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Error al crear solicitud', 'error');
    }
  };

  const getBadgeVariant = (estado) => {
    switch (estado) {
      case 'APROBADA': return 'success';
      case 'RECHAZADA': return 'danger';
      case 'EN_EVALUACION': return 'indigo';
      default: return 'warning';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Solicitudes de Crédito</h3>
          <p className="text-xs text-slate-500">Registro y seguimiento del flujo de solicitudes iniciales</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Nueva Solicitud
        </button>
      </div>

      {/* Tabla de Solicitudes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs">
                <th className="p-4">Nro Solicitud</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Tipo Crédito</th>
                <th className="p-4">Monto ($)</th>
                <th className="p-4">Plazo</th>
                <th className="p-4">Tasa Anual</th>
                <th className="p-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {solicitudes.map((s) => (
                <tr key={s.id_solicitud} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">#{s.id_solicitud}</td>
                  <td className="p-4 font-medium">{s.nombre_cliente || `Cliente ID: ${s.id_cliente}`}</td>
                  <td className="p-4 text-xs font-semibold text-slate-600">{s.tipo_credito}</td>
                  <td className="p-4 font-semibold text-slate-900">${s.monto_solicitado}</td>
                  <td className="p-4">{s.plazo_meses} meses</td>
                  <td className="p-4">{s.tasa_interes_anual}%</td>
                  <td className="p-4 text-center">
                    <Badge variant={getBadgeVariant(s.estado)}>{s.estado}</Badge>
                  </td>
                </tr>
              ))}
              {solicitudes.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No existen solicitudes registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva Solicitud con Simulación */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nueva Solicitud de Crédito"
      >
        <form onSubmit={handleCrearSolicitud} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Cliente Solicitante *</label>
            <select
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
              value={formSolicitud.id_cliente}
              onChange={(e) => setFormSolicitud({ ...formSolicitud, id_cliente: e.target.value })}
            >
              <option value="">-- Seleccionar Cliente --</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.ci} - {c.nombre} {c.apellido_paterno}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tipo de Crédito</label>
              <select
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                value={formSolicitud.tipo_credito}
                onChange={(e) => setFormSolicitud({ ...formSolicitud, tipo_credito: e.target.value })}
              >
                <option value="CONSUMO">Consumo</option>
                <option value="HIPOTECARIO">Hipotecario / Vivienda</option>
                <option value="MICROCREDITO">Microcrédito Productivo</option>
                <option value="COMERCIAL">Comercial Empresarial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Monto Solicitado ($) *</label>
              <input
                type="number"
                step="100"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                placeholder="Ej. 10000"
                value={formSolicitud.monto_solicitado}
                onChange={(e) => setFormSolicitud({ ...formSolicitud, monto_solicitado: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Plazo (Meses)</label>
              <input
                type="number"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formSolicitud.plazo_meses}
                onChange={(e) => setFormSolicitud({ ...formSolicitud, plazo_meses: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tasa Anual (%)</label>
              <input
                type="number"
                step="0.1"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formSolicitud.tasa_interes_anual}
                onChange={(e) => setFormSolicitud({ ...formSolicitud, tasa_interes_anual: e.target.value })}
              />
            </div>
          </div>

          {/* Caja de Simulación en Tiempo Real */}
          <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-sky-600" />
              <div>
                <span className="text-xs font-semibold text-sky-900 block">Cuota Mensual Estimada</span>
                <span className="text-xs text-sky-700">Amortización constante</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-sky-900">${calcularCuotaEstimada()}</span>
              <span className="text-xs text-sky-600 block">/ mes</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow"
            >
              Registrar Solicitud
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}