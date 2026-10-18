import React, { useEffect, useState } from 'react';
import { 
  CheckSquare, Search, ShieldCheck, AlertCircle, 
  FileText, ArrowRight, CheckCircle2, ShieldAlert, X,
  Calculator, TrendingUp, AlertTriangle, UserCheck, 
  RefreshCw, DollarSign, BarChart2, ChevronRight, Send
} from 'lucide-react';
import { api } from '../api/axios';

export default function EvaluacionPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [errorCargaSolicitudes, setErrorCargaSolicitudes] = useState('');
  const [guardandoEvaluacion, setGuardandoEvaluacion] = useState(false);
  const [solicitudSel, setSolicitudSel] = useState(null);
  const [pasoEval, setPasoEval] = useState(1); // 1: Buró (CU03), 2: Capacidad Pago (CU04), 3: Riesgo & Dictamen (CU05)
  const [notificacion, setNotificacion] = useState(null);

  // CU03: BURÓ CREDITICIO / ASFI
  const [consultandoBuro, setConsultandoBuro] = useState(false);
  const [simularErrorBuro, setSimularErrorBuro] = useState(false);
  const [datosBuro, setDatosBuro] = useState(null);

  // CU04: INGRESOS Y GASTOS (Atributos de public.evaluacion_credito)
  const [ingresosVerificados, setIngresosVerificados] = useState({ fijos: '', variables: '' });
  const [gastos, setGastos] = useState({
    alimentacion_hogar: '',
    alquiler_servicios: '',
    deudas_financieras: '',
    otros_gastos_operativos: ''
  });

  // CU05: NVEL DE RIESGO Y RESULTADO ('FAVORABLE' / 'DESFAVORABLE')
  const [evalRiesgo, setEvalRiesgo] = useState({
    nivel_riesgo: '',
    resultado: '' // El analista debe seleccionar un dictamen explícito.
  });

  const mostrarNotificacion = (tipo, titulo, mensaje) => {
    setNotificacion({ tipo, titulo, mensaje });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const calcularCuotaEstimada = (solicitud) => {
    const capital = Number(solicitud.monto_solicitado) || 0;
    const plazo = Number(solicitud.plazo_meses) || 0;
    const tasaMensual = (Number(solicitud.tasa_interes_anual) || 0) / 1200;

    if (capital <= 0 || plazo <= 0) return 0;
    if (tasaMensual === 0) return Number((capital / plazo).toFixed(2));

    const factor = Math.pow(1 + tasaMensual, plazo);
    return Number((capital * (tasaMensual * factor) / (factor - 1)).toFixed(2));
  };

  const normalizarSolicitud = (sol) => {
    const solicitud = {
      ...sol,
      id_solicitud: Number(sol.id_solicitud),
      id_cliente: Number(sol.id_cliente),
      monto_solicitado: Number(sol.monto_solicitado) || 0,
      plazo_meses: Number(sol.plazo_meses) || 0,
      tasa_interes_anual: Number(sol.tasa_interes_anual) || 0,
      cliente: sol.cliente || `${sol.nombres || ''} ${sol.apellidos || ''}`.trim(),
      ci: sol.ci || '',
      profesion_ocupacion: sol.profesion_ocupacion || 'Ocupación no registrada',
      ingresos_fijos_declarados: Number(sol.ingresos_fijos ?? sol.ingresos_fijos_declarados) || 0,
      ingresos_var_declarados: Number(sol.ingresos_variables ?? sol.ingresos_var_declarados) || 0,
    };

    return {
      ...solicitud,
      cuota_estimada: calcularCuotaEstimada(solicitud),
    };
  };

  const cargarSolicitudes = async () => {
    setCargandoSolicitudes(true);
    setErrorCargaSolicitudes('');

    try {
      const response = await api.get('/solicitudes');
      if (!Array.isArray(response.data)) {
        throw new Error('La API no devolvió una lista válida de solicitudes.');
      }

      const pendientes = response.data
        .filter((sol) => sol.estado === 'REGISTRADA')
        .map(normalizarSolicitud);

      setSolicitudes(pendientes);
    } catch (error) {
      const mensaje = error.response?.data?.error || error.message || 'No fue posible cargar las solicitudes.';
      setErrorCargaSolicitudes(mensaje);
      mostrarNotificacion('error', 'Error al cargar solicitudes', mensaje);
    } finally {
      setCargandoSolicitudes(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const handleSeleccionarSolicitud = (sol) => {
    setSolicitudSel(sol);
    setPasoEval(1);
    setDatosBuro(null);
    setIngresosVerificados({
      fijos: String(sol.ingresos_fijos_declarados ?? 0),
      variables: String(sol.ingresos_var_declarados ?? 0)
    });
    // Los gastos deben ser informados por el analista; no se precargan importes ficticios.
    setGastos({
      alimentacion_hogar: '',
      alquiler_servicios: '',
      deudas_financieras: '',
      otros_gastos_operativos: ''
    });
    setEvalRiesgo({
      nivel_riesgo: '',
      resultado: ''
    });
  };

  // CU03: CONSULTAR RIESGO EN ASFI / BURÓ
  const handleEjecutarConsultaBuro = () => {
    if (!solicitudSel) return;
    setConsultandoBuro(true);

    setTimeout(() => {
      setConsultandoBuro(false);

      if (simularErrorBuro) {
        mostrarNotificacion('error', 'Excepción CU03: Sistema Externo No Disponible', 'El servicio de la Central de Riesgos (ASFI) no respondió a la consulta.');
        return;
      }

      const resBuro = {
        ref_consulta: `ASFI-${Math.floor(100000 + Math.random() * 900000)}`,
        calificacion_asfi: 'A',
        score_crediticio: 820,
        deudas_sif: [
          { entidad: 'Banco Mercantil Santa Cruz', monto_otorgado: 15000, saldo_vigente: 2800, estado_cuota: 'AL_DIA' }
        ],
        dias_mora_historica: 0
      };

      setDatosBuro(resBuro);
      mostrarNotificacion('success', 'Simulación CU03 completada', `Se generaron datos ficticios de demostración (Ref: ${resBuro.ref_consulta}). No es una consulta real a ASFI.`);
    }, 1200);
  };

  // CU04: CÁLCULO DE CAPACIDAD DE PAGO
  const totalIngresos = parseFloat(ingresosVerificados.fijos || 0) + parseFloat(ingresosVerificados.variables || 0);
  const totalGastos = parseFloat(gastos.alimentacion_hogar || 0) + parseFloat(gastos.alquiler_servicios || 0) + parseFloat(gastos.deudas_financieras || 0) + parseFloat(gastos.otros_gastos_operativos || 0);
  const capacidadPagoCalculada = Number((totalIngresos - totalGastos).toFixed(2)); // capacidad_pago calculada en backend
  const cuotaCredito = solicitudSel ? solicitudSel.cuota_estimada : 0;
  const coberturaCuotaPct = cuotaCredito > 0 ? ((capacidadPagoCalculada / cuotaCredito) * 100).toFixed(1) : 0;

  // CU05: Guardar la evaluación y cambiar el estado mediante la API.
  const handleSubmitEvaluacionBD = async (e) => {
    e.preventDefault();

    if (!solicitudSel) return;

    if (!datosBuro) {
      mostrarNotificacion('error', 'CU03 incompleto', 'Ejecute el paso de consulta de buró de demostración antes de continuar.');
      return;
    }

    const importes = [
      ingresosVerificados.fijos,
      ingresosVerificados.variables,
      gastos.alimentacion_hogar,
      gastos.alquiler_servicios,
      gastos.deudas_financieras,
      gastos.otros_gastos_operativos,
    ];

    if (importes.some((valor) => valor === '' || !Number.isFinite(Number(valor)) || Number(valor) < 0)) {
      mostrarNotificacion('error', 'Importes inválidos', 'Complete todos los ingresos y gastos con valores numéricos mayores o iguales a cero.');
      return;
    }

    if (!['BAJO', 'MEDIO', 'ALTO', 'INACEPTABLE'].includes(evalRiesgo.nivel_riesgo)) {
      mostrarNotificacion('error', 'Nivel de riesgo requerido', 'Seleccione el nivel de riesgo obtenido durante el análisis.');
      return;
    }

    if (!['FAVORABLE', 'DESFAVORABLE'].includes(evalRiesgo.resultado)) {
      mostrarNotificacion('error', 'Dictamen requerido', 'Seleccione un resultado de evaluación.');
      return;
    }

    if (capacidadPagoCalculada <= 0 && evalRiesgo.resultado === 'FAVORABLE') {
      mostrarNotificacion('error', 'Capacidad de pago insuficiente', 'Una capacidad de pago nula o negativa no puede registrarse como FAVORABLE.');
      return;
    }

    if (evalRiesgo.nivel_riesgo === 'INACEPTABLE' && evalRiesgo.resultado === 'FAVORABLE') {
      mostrarNotificacion('error', 'Dictamen inconsistente', 'Un nivel de riesgo INACEPTABLE no puede tener resultado FAVORABLE.');
      return;
    }

    const payloadEvaluacionBD = {
      id_solicitud: solicitudSel.id_solicitud,
      ingresos: Number(totalIngresos.toFixed(2)),
      gastos: Number(totalGastos.toFixed(2)),
      nivel_riesgo: evalRiesgo.nivel_riesgo,
      resultado: evalRiesgo.resultado,
    };

    setGuardandoEvaluacion(true);

    try {
      const response = await api.post('/evaluaciones', payloadEvaluacionBD);
      const resultadoGuardado = response.data?.evaluacion?.resultado || response.data?.resultado || payloadEvaluacionBD.resultado;

      setSolicitudes((actuales) => actuales.filter(
        (sol) => sol.id_solicitud !== solicitudSel.id_solicitud
      ));
      setSolicitudSel(null);
      setDatosBuro(null);
      setPasoEval(1);

      mostrarNotificacion(
        'success',
        'Evaluación guardada',
        `La evaluación de SOL-#${payloadEvaluacionBD.id_solicitud} se guardó en Supabase con resultado ${resultadoGuardado}. La solicitud pasó a EN_EVALUACION.`
      );
    } catch (error) {
      const mensaje = error.response?.data?.error || 'No fue posible guardar la evaluación. Verifique el estado de la solicitud y la conexión con el backend.';
      mostrarNotificacion('error', 'No se guardó la evaluación', mensaje);
    } finally {
      setGuardandoEvaluacion(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TOAST SYSTEM */}
      {notificacion && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-fade-in">
          <div className={`rounded-xl p-4 shadow-2xl border bg-slate-900 text-white flex items-start gap-3 ${
            notificacion.tipo === 'success' ? 'border-emerald-500' : 'border-rose-500'
          }`}>
            <div className="mt-0.5 shrink-0">
              {notificacion.tipo === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-rose-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">{notificacion.titulo}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{notificacion.mensaje}</p>
            </div>
            <button onClick={() => setNotificacion(null)} className="text-slate-400 hover:text-white">&times;</button>
          </div>
        </div>
      )}

      {/* HEADER MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-800">Evaluación de Crédito (CU03 / CU04 / CU05)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mapeado a <code>public.evaluacion_credito</code> y transición de estado a <code>EN_EVALUACION</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
          <input 
            type="checkbox" 
            id="errorBuro" 
            checked={simularErrorBuro} 
            onChange={(e) => setSimularErrorBuro(e.target.checked)} 
            className="w-4 h-4 text-slate-800 rounded"
          />
          <label htmlFor="errorBuro" className="text-slate-600 font-medium cursor-pointer">
            Simular Fallo del Buró / ASFI
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <strong>Modo de demostración:</strong> la consulta del buró en esta pantalla genera datos ficticios locales; no consulta ASFI ni otra central de riesgo. No utilice ese resultado simulado para decisiones crediticias reales.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL IZQUIERDO: SOLICITUDES PENDIENTES (ESTADO: REGISTRADA) */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Solicitudes REGISTRADAS</h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {solicitudes.length} pendientes
            </span>
          </div>
          
          <div className="space-y-3">
            {cargandoSolicitudes ? (
              <div className="p-6 text-center text-slate-500 text-xs sm:text-sm">
                Cargando solicitudes desde el servidor...
              </div>
            ) : errorCargaSolicitudes ? (
              <div className="p-5 text-center space-y-3">
                <p className="text-xs text-rose-700">{errorCargaSolicitudes}</p>
                <button type="button" onClick={cargarSolicitudes} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold">
                  <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                </button>
              </div>
            ) : solicitudes.length > 0 ? (
              solicitudes.map((sol) => (
                <div 
                  key={sol.id_solicitud}
                  onClick={() => handleSeleccionarSolicitud(sol)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    solicitudSel?.id_solicitud === sol.id_solicitud 
                      ? 'border-slate-800 bg-slate-50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                      SOL-#{sol.id_solicitud}
                    </span>
                    <span className="text-xs font-bold text-slate-900">Bs. {sol.monto_solicitado.toLocaleString()}</span>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">{sol.cliente}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">C.I.: {sol.ci} | {sol.profesion_ocupacion || 'Ocupación no registrada'}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">{sol.destino_credito}</span>
                    <span className="text-slate-900 font-bold flex items-center gap-1">
                      Iniciar Evaluación <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs sm:text-sm">
                No existen solicitudes registradas pendientes de evaluación.
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: WIZARD DE EVALUACIÓN MULTI-PASO */}
        <div className="lg:col-span-2">
          {solicitudSel ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* TABS DE NAVEGACIÓN */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex overflow-x-auto gap-4 text-xs font-semibold">
                <button 
                  onClick={() => setPasoEval(1)}
                  className={`flex items-center gap-2 pb-1 border-b-2 transition-colors whitespace-nowrap ${
                    pasoEval === 1 ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${pasoEval === 1 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
                  CU03: Buró Crediticio
                </button>

                <button 
                  onClick={() => setPasoEval(2)}
                  className={`flex items-center gap-2 pb-1 border-b-2 transition-colors whitespace-nowrap ${
                    pasoEval === 2 ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${pasoEval === 2 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
                  CU04: Capacidad de Pago
                </button>

                <button 
                  onClick={() => setPasoEval(3)}
                  className={`flex items-center gap-2 pb-1 border-b-2 transition-colors whitespace-nowrap ${
                    pasoEval === 3 ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${pasoEval === 3 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
                  CU05: Evaluar Riesgo & Resultado
                </button>
              </div>

              <div className="p-6 space-y-6">
                
                {/* CABECERA RESUMEN */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-xs block">Solicitud Evaluada</span>
                    <span className="font-bold text-slate-900">SOL-#{solicitudSel.id_solicitud}</span> - {solicitudSel.cliente}
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Monto Solicitado</span>
                    <span className="font-bold text-slate-900">Bs. {solicitudSel.monto_solicitado.toLocaleString()}</span> ({solicitudSel.plazo_meses} meses)
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Cuota mensual estimada</span>
                    <span className="font-bold text-slate-900">Bs. {solicitudSel.cuota_estimada.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* PASO 1: CU03 - HISTORIAL CREDITICIO (BURÓ) */}
                {pasoEval === 1 && (
                  <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800">CU03 – Consulta de historial crediticio (simulación local)</h3>
                      <button
                        type="button"
                        onClick={handleEjecutarConsultaBuro}
                        disabled={consultandoBuro}
                        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                      >
                        {consultandoBuro ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {datosBuro ? 'Consultar de Nuevo' : 'Consultar Buró de Riesgo'}
                      </button>
                    </div>

                    {datosBuro ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                            <span className="text-xs text-slate-500 font-medium block">Calificación simulada</span>
                            <span className="text-xl font-black text-emerald-700">Clase {datosBuro.calificacion_asfi}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                            <span className="text-xs text-slate-500 font-medium block">Score Crediticio</span>
                            <span className="text-xl font-black text-slate-800">{datosBuro.score_crediticio} / 850</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                            <span className="text-xs text-slate-500 font-medium block">Días de Mora Histórica</span>
                            <span className="text-xl font-black text-emerald-600">{datosBuro.dias_mora_historica} días</span>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                          <div className="bg-slate-100 p-2.5 font-bold text-slate-700">Deudas Vigentes en el Sistema Financiero</div>
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase">
                              <tr>
                                <th className="p-2.5">Entidad</th>
                                <th className="p-2.5">Monto Otorgado</th>
                                <th className="p-2.5">Saldo Vigente</th>
                                <th className="p-2.5">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {datosBuro.deudas_sif.map((d, i) => (
                                <tr key={i}>
                                  <td className="p-2.5 font-medium text-slate-800">{d.entidad}</td>
                                  <td className="p-2.5 text-slate-600">Bs. {d.monto_otorgado.toLocaleString()}</td>
                                  <td className="p-2.5 font-bold text-slate-900">Bs. {d.saldo_vigente.toLocaleString()}</td>
                                  <td className="p-2.5"><span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">{d.estado_cuota}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button onClick={() => setPasoEval(2)} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold">
                            Siguiente: Capacidad de Pago (CU04) <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 p-8 rounded-xl text-center text-xs text-slate-500">
                        Presione el botón para generar un resultado ficticio de demostración. La integración real con ASFI aún no está configurada.
                      </div>
                    )}
                  </div>
                )}

                {/* PASO 2: CU04 - EVALUAR CAPACIDAD DE PAGO */}
                {pasoEval === 2 && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-slate-800">CU04 – Evaluar Capacidad de Pago (Atributos: ingresos / gastos)</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* INGRESOS (numeric) */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ingresos Verificados (ingresos)</h4>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Ingresos Fijos Mensuales (Bs.)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={ingresosVerificados.fijos} 
                            onChange={(e) => setIngresosVerificados({ ...ingresosVerificados, fijos: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Ingresos Variables Promedio (Bs.)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={ingresosVerificados.variables} 
                            onChange={(e) => setIngresosVerificados({ ...ingresosVerificados, variables: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white"
                          />
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-xs text-slate-900">
                          <span>Total Ingresos (numeric):</span>
                          <span>Bs. {totalIngresos.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* GASTOS (numeric) */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gastos & Egresos (gastos)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-1">Alimentación / Hogar</label>
                            <input type="number" step="0.01" value={gastos.alimentacion_hogar} onChange={(e) => setGastos({ ...gastos, alimentacion_hogar: e.target.value })} className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-1">Alquiler / Servicios</label>
                            <input type="number" step="0.01" value={gastos.alquiler_servicios} onChange={(e) => setGastos({ ...gastos, alquiler_servicios: e.target.value })} className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-1">Deudas Financieras</label>
                            <input type="number" step="0.01" value={gastos.deudas_financieras} onChange={(e) => setGastos({ ...gastos, deudas_financieras: e.target.value })} className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-600 mb-1">Otros Operativos</label>
                            <input type="number" step="0.01" value={gastos.otros_gastos_operativos} onChange={(e) => setGastos({ ...gastos, otros_gastos_operativos: e.target.value })} className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-xs text-slate-900">
                          <span>Total Gastos (numeric):</span>
                          <span>Bs. {totalGastos.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* CAPACIDAD DE PAGO CALCULADA (capacidad_pago) */}
                    <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block">capacidad_pago (ingresos - gastos):</span>
                        <span className="text-2xl font-black text-slate-900">Bs. {capacidadPagoCalculada.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block">Cuota Solicitada:</span>
                        <span className="text-lg font-bold text-slate-800">Bs. {cuotaCredito.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-500 block">Cobertura de Cuota:</span>
                        <span className={`text-2xl font-black ${coberturaCuotaPct >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {coberturaCuotaPct}%
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button onClick={() => setPasoEval(1)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg">Atrás</button>
                      <button onClick={() => setPasoEval(3)} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold">
                        Siguiente: Riesgo y Resultado (CU05) <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* PASO 3: CU05 - EVALUAR RIESGO Y GUARDAR EN BD */}
                {pasoEval === 3 && (
                  <form onSubmit={handleSubmitEvaluacionBD} className="space-y-5">
                    <h3 className="text-sm font-bold text-slate-800">CU05 – Evaluar Riesgo y Resultado Final</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">nivel_riesgo (varchar 20) *</label>
                        <select 
                          value={evalRiesgo.nivel_riesgo}
                          onChange={(e) => setEvalRiesgo({ ...evalRiesgo, nivel_riesgo: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white"
                        >
                          <option value="">Seleccione nivel de riesgo</option>
                          <option value="BAJO">BAJO</option>
                          <option value="MEDIO">MEDIO</option>
                          <option value="ALTO">ALTO</option>
                          <option value="INACEPTABLE">INACEPTABLE</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">resultado (CHECK: FAVORABLE / DESFAVORABLE) *</label>
                        <select 
                          value={evalRiesgo.resultado}
                          onChange={(e) => setEvalRiesgo({ ...evalRiesgo, resultado: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white"
                        >
                          <option value="">Seleccione dictamen</option>
                          <option value="FAVORABLE">FAVORABLE</option>
                          <option value="DESFAVORABLE">DESFAVORABLE</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                      <p className="font-bold">Postcondiciones al guardar esta evaluación:</p>
                      <p>&bull; Inserta 1 fila en la tabla <code>public.evaluacion_credito</code> con ingresos, gastos, capacidad_pago y resultado.</p>
                      <p>&bull; Actualiza la tabla <code>public.solicitud_credito</code> cambiando el estado de <code>REGISTRADA</code> &rarr; <code>EN_EVALUACION</code>.</p>
                      <p>&bull; La solicitud pasa a revisión del Jefe de Créditos (CU07); el backend debe impedir su aprobación si el dictamen es DESFAVORABLE.</p>
                    </div>

                    <div className="flex justify-between pt-3 border-t border-slate-200">
                      <button type="button" onClick={() => setPasoEval(2)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg">Atrás</button>
                      <button type="submit" disabled={guardandoEvaluacion} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed">
                        {guardandoEvaluacion ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {guardandoEvaluacion ? 'Guardando evaluación...' : 'Guardar Evaluación (CU05)'}
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs sm:text-sm">
              Seleccione una solicitud de la lista izquierda para iniciar la evaluación técnica.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}