import React, { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { BarChart3, TrendingUp, AlertOctagon, Wallet } from 'lucide-react';

export default function ReportesPage() {
  const [cartera, setCartera] = useState([]);
  const [mora, setMora] = useState([]);

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        const resCartera = await api.get('/reportes/cartera');
        const resMora = await api.get('/reportes/mora');
        setCartera(resCartera.data.resumen_cartera || []);
        setMora(resMora.data.creditos_en_mora || []);
      } catch (err) {
        console.error(err);
      }
    };
    cargarReportes();
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Créditos Activos</span>
            <h4 className="text-2xl font-bold text-slate-800">{cartera.length}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Casos en Mora</span>
            <h4 className="text-2xl font-bold text-rose-600">{mora.length}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Estado Sistema</span>
            <h4 className="text-sm font-bold text-emerald-600">100% Saludable</h4>
          </div>
        </div>
      </div>

      {/* Tabla de Cartera por Estado */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sky-600" /> Resumen de Cartera de Crédito (CU14)
        </h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs uppercase">
              <th className="p-3">Estado</th>
              <th className="p-3">Total Créditos</th>
              <th className="p-3">Monto Otorgado ($)</th>
              <th className="p-3">Saldo Pendiente ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {cartera.map((c, i) => (
              <tr key={i}>
                <td className="p-3 font-semibold">{c.estado}</td>
                <td className="p-3">{c.total_creditos}</td>
                <td className="p-3">${c.monto_total_otorgado}</td>
                <td className="p-3">${c.saldo_pendiente_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}