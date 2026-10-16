import React, { useState, useEffect } from 'react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import { ShieldAlert, Calculator, Search, CheckCircle } from 'lucide-react';

export default function EvaluacionPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudSel, setSolicitudSel] = useState(null);
  const [ingresos, setIngresos] = useState('');
  const [gastos, setGastos] = useState('');
  const [historialRiesgo, setHistorialRiesgo] = useState(null);
  const [loadingRiesgo, setLoadingRiesgo] = useState(false);

  const cargarSolicitudes = async () => {
    try {
      const res = await api.get('/solicitudes');
      // Filtrar solicitudes listas para evaluación
      setSolicitudes(res.data.filter(s => s.estado === 'REGISTRADA' || s.estado === 'EN_EVALUACION'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  // CU03: Consultar Sistema de Riesgo Crediticio Extero (Infocred)
  const consultarRiesgoExterno = async (ci) => {
    setLoadingRiesgo(true);
    try {
      const res = await api.get(`/integraciones/riesgo/${ci}`);
      setHistorialRiesgo(res.data.cliente);
      Swal.fire('Consulta Exitosa', 'Historial crediticio obtenido del sistema externo', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo consultar el sistema de riesgo', 'error');
    } finally {
      setLoadingRiesgo(false);
    }
  };

  // CU04 & CU05: Guardar Evaluación Financiera
  const handleGuardarEvaluacion = async (e) => {
    e.preventDefault();
    if (!solicitudSel || !historialRiesgo) {
      return Swal.fire('Atención', 'Debe seleccionar una solicitud y consultar el riesgo externo', 'warning');
    }

    try {
      const capacidadCalculada = parseFloat(ingresos) - parseFloat(gastos);
      const dictamen = capacidadCalculada > 0 && historialRiesgo.score_crediticio >= 600 ? 'FAVORABLE' : 'DESFAVORABLE';

      await api.post('/evaluaciones/capacidad-pago', {
        id_solicitud: solicitudSel.id_solicitud,
        ingresos: parseFloat(ingresos),
        gastos: parseFloat(gastos),
        capacidad_pago: capacidadCalculada,
        nivel_riesgo: historialRiesgo.nivel_riesgo,
        resultado: dictamen
      });

      Swal.fire('Evaluación Registrada', `Resultado de evaluación: ${dictamen}`, 'success');
      setSolicitudSel(null);
      setHistorialRiesgo(null);
      cargarSolicitudes();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Error al guardar la evaluación', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de Solicitudes Pendientes */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-sky-600" /> Solicitudes por Evaluar
          </h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {solicitudes.map((s) => (
              <div
                key={s.id_solicitud}
                onClick={() => {
                  setSolicitudSel(s);
                  consultarRiesgoExterno(s.ci_cliente || '1234567');
                }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  solicitudSel?.id_solicitud === s.id_solicitud
                    ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900 text-sm">Solicitud #{s.id_solicitud}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">{s.estado}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">Monto: ${s.monto_solicitado} - Plazo: {s.plazo_meses} meses</p>
              </div>
            ))}
          </div>
        </div>

        {/* Panel de Evaluación y Riesgo Extero */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 space-y-6">
          {solicitudSel ? (
            <>
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-bold text-slate-900">Evaluación para Solicitud #{solicitudSel.id_solicitud}</h3>
                <p className="text-sm text-slate-500">Monto Solicitado: ${solicitudSel.monto_solicitado}</p>
              </div>

              {/* Consulta Central de Riesgo Externa (CU03) */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" /> Central de Información Crediticia Externa (Infocred)
                </h4>
                {loadingRiesgo ? (
                  <p className="text-xs text-slate-500">Consultando antecedentes externos...</p>
                ) : historialRiesgo ? (
                  <div className="grid grid-cols-3 gap-4 text-xs mt-3">
                    <div className="bg-white p-2.5 rounded border">
                      <span className="text-slate-400 block">Score Crediticio</span>
                      <span className="font-bold text-slate-800 text-sm">{historialRiesgo.score_crediticio} pts</span>
                    </div>
                    <div className="bg-white p-2.5 rounded border">
                      <span className="text-slate-400 block">Nivel de Riesgo</span>
                      <span className="font-bold text-indigo-600 text-sm">{historialRiesgo.nivel_riesgo}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded border">
                      <span className="text-slate-400 block">Dictamen Recomendado</span>
                      <span className="font-bold text-emerald-600 text-sm">{historialRiesgo.dictamen_recomendado}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Formulario Capacidad de Pago (CU04) */}
              <form onSubmit={handleGuardarEvaluacion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ingresos Mensuales ($)</label>
                    <input
                      type="number"
                      required
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                      value={ingresos}
                      onChange={(e) => setIngresos(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gastos Mensuales ($)</label>
                    <input
                      type="number"
                      required
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                      value={gastos}
                      onChange={(e) => setGastos(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Registrar Evaluación de Crédito
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              Seleccione una solicitud de la lista izquierda para iniciar la evaluación.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}