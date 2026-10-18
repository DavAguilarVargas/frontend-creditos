import React, { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { 
  FileText, Search, CheckCircle2, ShieldAlert, 
  X, Calculator, Eye, ShieldCheck, Banknote, 
  Clock, ArrowRight, Filter, AlertCircle, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// TARIFARIO INSTITUCIONAL
const TARIFARIO = {
  'Mi negocio': {
    'Capital de Operaciones': { maxPlazo: 36, maxMonto: 350000, hipotecaria: 10.5, otras: 22.0 },
    'Capital de Inversión': { maxPlazo: 120, maxMonto: 700000, hipotecaria: 10.5, otras: 22.0 },
    'Productivo': { maxPlazo: 120, maxMonto: 700000, hipotecaria: 6.0, otras: 6.0 }
  },
  'Personal': {
    'Efectivo': { maxPlazo: 24, maxMonto: 70000, hipotecaria: 13.5, otras: 20.0 },
    'Vehicular': { maxPlazo: 60, maxMonto: 140000, hipotecaria: 10.5, otras: 12.0 }
  },
  'Vivienda': {
    'Vivienda Normal': { maxPlazo: 180, maxMonto: 700000, hipotecaria: 11.5, otras: 16.0 },
    'Vivienda Social': { maxPlazo: 180, maxMonto: 700000, hipotecaria: 5.5, otras: 5.5 }
  }
};

export default function SolicitudesPage() {
  const navigate = useNavigate();

  // ================= ESTADO DE VISTA Y MÓDULO =================
  const [vistaActiva, setVistaActiva] = useState('SEGUIMIENTO'); // 'SEGUIMIENTO' | 'SIMULADOR'
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [guardandoSolicitud, setGuardandoSolicitud] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [errorCargaSolicitudes, setErrorCargaSolicitudes] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState(null);

  // MODAL DETALLE Y TRAZABILIDAD
  const [solicitudDetalle, setSolicitudDetalle] = useState(null);

  // ================= ESTADO: SIMULADOR =================
  const [categoria, setCategoria] = useState('Personal');
  const [subCategoria, setSubCategoria] = useState('Efectivo');
  const [garantia, setGarantia] = useState('Otras garantías');
  const [montoSimulador, setMontoSimulador] = useState(10000);
  const [plazoSimulador, setPlazoSimulador] = useState(12);

  const datosActuales = TARIFARIO[categoria][subCategoria];
  const tasaActual = garantia === 'Garantía hipotecaria' ? datosActuales.hipotecaria : datosActuales.otras;

  useEffect(() => {
    if (plazoSimulador > datosActuales.maxPlazo) setPlazoSimulador(datosActuales.maxPlazo);
    if (montoSimulador > datosActuales.maxMonto) setMontoSimulador(datosActuales.maxMonto);
  }, [categoria, subCategoria, datosActuales, plazoSimulador, montoSimulador]);

  const calcularCuotaSimulador = () => {
    if (montoSimulador === 0 || plazoSimulador === 0) return '0.00';
    const i_mensual = (tasaActual / 100) / 12;
    const cuota = montoSimulador * (i_mensual * Math.pow(1 + i_mensual, plazoSimulador)) / (Math.pow(1 + i_mensual, plazoSimulador) - 1);
    return cuota.toFixed(2);
  };

  // ================= ESTADO: MODAL NUEVA SOLICITUD =================
  const [showModal, setShowModal] = useState(false);
  const [ciBusqueda, setCiBusqueda] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  
  const [solicitudForm, setSolicitudForm] = useState({
    monto_solicitado: '',
    plazo_meses: '',
    tasa_interes_anual: '', 
    destino_credito: '',
    tipo_garantia: ''
  });
  
  const [documentos, setDocumentos] = useState({
    fotocopia_ci: false,
    boleta_ingresos: false,
    croquis_domicilio: false,
    aviso_servicios: false
  });

  const mostrarNotificacion = (tipo, titulo, mensaje) => {
    setNotificacion({ tipo, titulo, mensaje });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const normalizarSolicitud = (solicitud) => ({
    ...solicitud,
    cliente: solicitud.cliente || [solicitud.nombres, solicitud.apellidos].filter(Boolean).join(' ') || 'Cliente no disponible',
    ci: String(solicitud.ci || ''),
    monto_solicitado: Number(solicitud.monto_solicitado || 0),
    plazo_meses: Number(solicitud.plazo_meses || 0),
    tasa_interes_anual: Number(solicitud.tasa_interes_anual || 0),
    garantia_vinculada: solicitud.garantia_vinculada === true || solicitud.garantia_vinculada === 'true' || solicitud.garantia_vinculada === 't',
    evaluacion_dictamen: solicitud.evaluacion_dictamen || null,
  });

  const cargarSolicitudes = async () => {
    setCargandoSolicitudes(true);
    setErrorCargaSolicitudes('');
    try {
      const response = await api.get('/solicitudes');
      const datos = Array.isArray(response.data) ? response.data.map(normalizarSolicitud) : [];
      setSolicitudes(datos);
    } catch (error) {
      const mensaje = error.response?.data?.error || 'No fue posible consultar las solicitudes. Verifique la conexión y sus permisos.';
      setErrorCargaSolicitudes(mensaje);
      mostrarNotificacion('error', 'Error al cargar solicitudes', mensaje);
    } finally {
      setCargandoSolicitudes(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const handleOpenModalNueva = () => {
    setSolicitudForm({
      monto_solicitado: montoSimulador,
      plazo_meses: plazoSimulador,
      tasa_interes_anual: tasaActual.toFixed(2),
      destino_credito: subCategoria,
      tipo_garantia: garantia === 'Garantía hipotecaria' ? 'HIPOTECARIA' : 'PERSONAL'
    });
    setShowModal(true);
  };

  const handleBuscarCliente = async () => {
    const ci = ciBusqueda.trim();
    if (!ci) {
      mostrarNotificacion('warning', 'Campo vacío', 'Ingrese un CI para buscar al cliente.');
      return;
    }

    setBuscandoCliente(true);
    try {
      const response = await api.get('/clientes', { params: { ci } });
      const encontrados = Array.isArray(response.data) ? response.data : [];
      const encontrado = encontrados.find(cliente => String(cliente.ci || '').trim() === ci) || encontrados[0];

      if (encontrado) {
        setClienteEncontrado(encontrado);
        mostrarNotificacion('success', 'Cliente identificado', `${encontrado.nombres} ${encontrado.apellidos} seleccionado.`);
      } else {
        setClienteEncontrado(null);
        mostrarNotificacion('error', 'Cliente no encontrado', 'El CI ingresado no existe en la base de datos. Registre primero al cliente.');
      }
    } catch (error) {
      setClienteEncontrado(null);
      mostrarNotificacion('error', 'Error de búsqueda', error.response?.data?.error || 'No fue posible consultar el cliente.');
    } finally {
      setBuscandoCliente(false);
    }
  };

  const handleSolicitudChange = (e) => setSolicitudForm({ ...solicitudForm, [e.target.name]: e.target.value });
  const handleDocChange = (e) => setDocumentos({ ...documentos, [e.target.name]: e.target.checked });

  const handleSubmitSolicitud = async (e) => {
    e.preventDefault();
    if (guardandoSolicitud) return;

    if (!clienteEncontrado?.id_cliente) {
      mostrarNotificacion('error', 'Cliente requerido', 'Busque y seleccione un cliente registrado.');
      return;
    }

    const docsCompletos = Object.values(documentos).every(doc => doc === true);
    if (!docsCompletos) {
      mostrarNotificacion('error', 'Documentación incompleta', 'Verifique la recepción de todos los documentos requeridos. Esta lista de comprobación no almacena los archivos.');
      return;
    }

    const monto = Number(solicitudForm.monto_solicitado);
    const plazo = Number(solicitudForm.plazo_meses);
    const tasa = Number(solicitudForm.tasa_interes_anual);
    const destino = String(solicitudForm.destino_credito || '').trim();
    const tipoGarantia = String(solicitudForm.tipo_garantia || '').trim().toUpperCase();

    if (!Number.isFinite(monto) || monto <= 0 || !Number.isInteger(plazo) || plazo <= 0 || !Number.isFinite(tasa) || tasa < 0 || !destino) {
      mostrarNotificacion('error', 'Parámetros inválidos', 'Verifique monto, plazo, tasa y destino del crédito.');
      return;
    }

    if (!['HIPOTECARIA', 'PRENDARIA', 'PERSONAL', 'DPF'].includes(tipoGarantia)) {
      mostrarNotificacion('error', 'Tipo de garantía inválido', 'Seleccione un tipo de garantía permitido.');
      return;
    }

    setGuardandoSolicitud(true);
    try {
      const response = await api.post('/solicitudes', {
        id_cliente: Number(clienteEncontrado.id_cliente),
        monto_solicitado: monto,
        plazo_meses: plazo,
        tasa_interes_anual: tasa,
        destino_credito: destino,
        tipo_garantia: tipoGarantia,
      });

      const idSolicitud = response.data?.id_solicitud || response.data?.solicitud?.id_solicitud;
      await cargarSolicitudes();
      mostrarNotificacion('success', 'Solicitud registrada (CU02)', `La solicitud ${idSolicitud ? `SOL-#${idSolicitud}` : ''} se guardó en la base de datos con estado REGISTRADA.`);

      setShowModal(false);
      setClienteEncontrado(null);
      setCiBusqueda('');
      setDocumentos({ fotocopia_ci: false, boleta_ingresos: false, croquis_domicilio: false, aviso_servicios: false });
      setVistaActiva('SEGUIMIENTO');
    } catch (error) {
      mostrarNotificacion('error', 'No se pudo registrar la solicitud', error.response?.data?.error || 'Ocurrió un error al registrar la solicitud. Verifique la API y vuelva a intentarlo.');
    } finally {
      setGuardandoSolicitud(false);
    }
  };

  // FILTRADO DE SOLICITUDES EN SEGUIMIENTO
  const solicitudesFiltradas = solicitudes.filter(s => {
    const coincideEstado = filtroEstado === 'TODOS' || s.estado === filtroEstado;
    const coincideBusqueda = String(s.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) || 
                             String(s.ci || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                             s.id_solicitud.toString().includes(busqueda);
    return coincideEstado && coincideBusqueda;
  });

  return (
    <div className="bg-zinc-50 min-h-screen text-slate-800 font-sans relative space-y-6">
      
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

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-800">Módulo de Solicitudes y Seguimiento (CU02)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">Gestión del Oficial de Crédito · Cotización y seguimiento de expedientes.</p>
        </div>

        {/* NAVEGACIÓN ENTRE VISTAS */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setVistaActiva('SEGUIMIENTO')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
              vistaActiva === 'SEGUIMIENTO' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bandeja de Seguimiento ({solicitudes.length})
          </button>
          <button
            onClick={() => setVistaActiva('SIMULADOR')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
              vistaActiva === 'SIMULADOR' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simulador & Cotizador
          </button>
        </div>
      </div>

      {/* ================= VISTA 1: BANDEJA DE SEGUIMIENTO DE EXPEDIENTES ================= */}
      {vistaActiva === 'SEGUIMIENTO' && (
        <div className="space-y-4">
          
          {/* BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por N° Solicitud, Cliente o C.I...."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full sm:w-80 text-xs sm:text-sm border-none focus:outline-none text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* FILTROS RÁPIDOS POR ESTADO DE BD */}
            <div className="flex overflow-x-auto w-full sm:w-auto gap-1 pb-1 sm:pb-0 text-xs">
              {['TODOS', 'REGISTRADA', 'EN_EVALUACION', 'APROBADA', 'RECHAZADA'].map((e) => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                    filtroEstado === e 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* TABLA DE SEGUIMIENTO */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Solicitud / Cliente</th>
                    <th className="p-4">Condiciones Crédito</th>
                    <th className="p-4">Estado en BD</th>
                    <th className="p-4">Garantía (CU06)</th>
                    <th className="p-4 text-right">Acciones de Seguimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cargandoSolicitudes ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400 text-sm">Cargando solicitudes...</td></tr>
                  ) : solicitudesFiltradas.length > 0 ? (
                    solicitudesFiltradas.map((sol) => (
                      <tr key={sol.id_solicitud} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-700 rounded mb-1 font-semibold">
                            SOL-#{sol.id_solicitud}
                          </span>
                          <div className="font-semibold text-slate-900">{sol.cliente}</div>
                          <div className="text-xs text-slate-400">C.I.: {sol.ci} | {sol.fecha_solicitud_local || sol.fecha_solicitud}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">Bs. {sol.monto_solicitado.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">{sol.plazo_meses} meses @ {sol.tasa_interes_anual}% ({sol.destino_credito})</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            sol.estado === 'REGISTRADA' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            sol.estado === 'EN_EVALUACION' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                            sol.estado === 'APROBADA' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {sol.estado}
                          </span>
                        </td>
                        <td className="p-4">
                          {sol.garantia_vinculada ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5" /> Registrada
                            </span>
                          ) : (
                            <button
                              onClick={() => navigate('/garantias')}
                              className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 transition-colors"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" /> Vincular (CU06)
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setSolicitudDetalle(sol)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detalle
                          </button>

                          {sol.estado === 'APROBADA' && (
                            <button
                              onClick={() => navigate('/desembolsos')}
                              className="p-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold"
                            >
                              <Banknote className="w-3.5 h-3.5" /> Desembolsar (CU11)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400 text-sm">
                        {errorCargaSolicitudes ? `No se pudieron cargar las solicitudes: ${errorCargaSolicitudes}` : "No hay solicitudes registradas que coincidan con los filtros."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VISTA 2: COTIZADOR & SIMULADOR DE CRÉDITOS ================= */}
      {vistaActiva === 'SIMULADOR' && (
        <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 pb-12">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-8">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-slate-600" /> Parámetros del Préstamo
            </h3>
            
            <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none snap-x mb-4">
              {Object.keys(TARIFARIO).map(cat => (
                <button key={cat} onClick={() => { setCategoria(cat); setSubCategoria(Object.keys(TARIFARIO[cat])[0]); }}
                  className={`snap-start whitespace-nowrap px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${categoria === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >{cat}</button>
              ))}
            </div>

            <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none snap-x mb-8">
              {Object.keys(TARIFARIO[categoria]).map(sub => (
                <button key={sub} onClick={() => setSubCategoria(sub)}
                  className={`snap-start whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${subCategoria === sub ? 'bg-slate-200 text-slate-900 border border-slate-300' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                >{sub}</button>
              ))}
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs sm:text-sm font-semibold text-slate-600">Monto Necesario (Bs.)</label>
                <span className="text-xl font-bold text-slate-900">Bs. {parseInt(montoSimulador).toLocaleString()}</span>
              </div>
              <input type="range" min="1000" max={datosActuales.maxMonto} step="500" value={montoSimulador} onChange={(e) => setMontoSimulador(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900" />
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs sm:text-sm font-semibold text-slate-600">Plazo (Meses)</label>
                <span className="text-xl font-bold text-slate-900">{plazoSimulador} meses</span>
              </div>
              <input type="range" min="1" max={datosActuales.maxPlazo} step="1" value={plazoSimulador} onChange={(e) => setPlazoSimulador(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900" />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-semibold text-slate-600 block mb-3">Tipo de Garantía Propuesta</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3.5 rounded-lg border border-slate-200 hover:border-slate-300">
                  <input type="radio" name="garantia" value="Garantía hipotecaria" checked={garantia === 'Garantía hipotecaria'} onChange={(e) => setGarantia(e.target.value)} className="w-4 h-4 text-slate-900" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Hipotecaria (Inmueble)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3.5 rounded-lg border border-slate-200 hover:border-slate-300">
                  <input type="radio" name="garantia" value="Otras garantías" checked={garantia === 'Otras garantías'} onChange={(e) => setGarantia(e.target.value)} className="w-4 h-4 text-slate-900" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Otras (Personal/Prendaria)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Resumen de Cotización</h4>
              
              <div className="text-center bg-slate-50 rounded-xl py-6 px-4 border border-slate-100 mb-6">
                <span className="block text-slate-500 text-xs font-medium mb-1">Cuota Mensual Estimada</span>
                <span className="block text-3xl sm:text-4xl font-black text-slate-900">Bs {calcularCuotaSimulador()}</span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600 mb-6">
                <div className="flex justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-slate-500">Tipo de Crédito</span>
                  <span className="font-bold text-slate-900">{subCategoria}</span>
                </div>
                <div className="flex justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-slate-500">Interés Anual</span>
                  <span className="font-bold text-slate-900">{tasaActual.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Garantía</span>
                  <span className="font-bold text-slate-900">{garantia === 'Garantía hipotecaria' ? 'Hipotecaria' : 'Otras'}</span>
                </div>
              </div>

              <button 
                onClick={handleOpenModalNueva} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg shadow transition-colors text-sm"
              >
                Proceder con Solicitud
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ================= MODAL DETALLE Y TRAZABILIDAD DEL EXPEDIENTE ================= */}
      {solicitudDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Expediente SOL-#{solicitudDetalle.id_solicitud}</h3>
                <p className="text-xs text-slate-500">Seguimiento de trazabilidad RNF06</p>
              </div>
              <button onClick={() => setSolicitudDetalle(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>

            <div className="p-6 space-y-5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div><span className="text-slate-500 block">Cliente:</span><span className="font-bold text-slate-900">{solicitudDetalle.cliente}</span></div>
                <div><span className="text-slate-500 block">C.I.:</span><span className="font-mono text-slate-900">{solicitudDetalle.ci}</span></div>
                <div><span className="text-slate-500 block">Monto Solicitado:</span><span className="font-bold text-slate-900">Bs. {solicitudDetalle.monto_solicitado.toLocaleString()}</span></div>
                <div><span className="text-slate-500 block">Estado Actual:</span><span className="font-bold text-slate-900">{solicitudDetalle.estado}</span></div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[11px] tracking-wider text-slate-400">Dictamen e Historial de Evaluación</h4>
                <div className="p-3 bg-slate-100 rounded-lg text-slate-700 leading-relaxed">
                  {solicitudDetalle.evaluacion_dictamen || 'Solicitud en estado REGISTRADA. Pendiente de toma por el Analista de Crédito.'}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button onClick={() => setSolicitudDetalle(null)} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-xs">Cerrar Detalle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL REGISTRAR NUEVA SOLICITUD (CU02) ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-3xl my-0 sm:my-auto relative flex flex-col max-h-[92vh]">
            
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center rounded-t-2xl sm:rounded-t-xl z-10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Registrar Solicitud Oficial (CU02)</h2>
                <p className="text-xs text-slate-500">Estado inicial: <span className="font-bold text-emerald-600">REGISTRADA</span></p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold text-2xl p-1">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Seleccionar Cliente Registrado</h3>
                <div className="flex gap-2 max-w-md mb-3">
                  <input 
                    type="text" 
                    className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" 
                    placeholder="Ingrese C.I. (ej. 4521378)" 
                    value={ciBusqueda} 
                    onChange={(e) => setCiBusqueda(e.target.value)} 
                  />
                  <button type="button" onClick={handleBuscarCliente} disabled={buscandoCliente} className="bg-slate-900 text-white text-sm font-semibold py-2 px-5 rounded-lg disabled:opacity-60">{buscandoCliente ? 'Buscando...' : 'Buscar'}</button>
                </div>
                {clienteEncontrado && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs sm:text-sm text-slate-700 space-y-1">
                    <div><span className="font-bold text-slate-900">Cliente:</span> {clienteEncontrado.nombres} {clienteEncontrado.apellidos}</div>
                    <div><span className="font-bold text-slate-900">Ingresos Declarados:</span> Bs. {parseFloat(clienteEncontrado.ingresos_fijos || 0).toLocaleString()}</div>
                  </div>
                )}
              </div>

              {clienteEncontrado && (
                <form onSubmit={handleSubmitSolicitud} className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Parámetros del Crédito</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Destino del Crédito</label>
                        <input type="text" name="destino_credito" value={solicitudForm.destino_credito} onChange={handleSolicitudChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Garantía Propuesta</label>
                        <select name="tipo_garantia" value={solicitudForm.tipo_garantia} onChange={handleSolicitudChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white">
                          <option value="HIPOTECARIA">Hipotecaria</option>
                          <option value="PRENDARIA">Prendaria</option>
                          <option value="PERSONAL">Personal</option>
                          <option value="DPF">Depósito a Plazo Fijo (DPF)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Monto Solicitado (Bs.)</label>
                        <input type="number" name="monto_solicitado" value={solicitudForm.monto_solicitado} onChange={handleSolicitudChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Plazo (Meses)</label>
                        <input type="number" name="plazo_meses" value={solicitudForm.plazo_meses} onChange={handleSolicitudChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tasa Interés Anual (%)</label>
                        <input type="number" step="0.01" name="tasa_interes_anual" value={solicitudForm.tasa_interes_anual} onChange={handleSolicitudChange} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Verificación de Documentación Requerida</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.keys(documentos).map(doc => (
                        <label key={doc} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" name={doc} checked={documentos[doc]} onChange={handleDocChange} className="w-4 h-4 text-slate-900 rounded" />
                          <span className="text-xs sm:text-sm text-slate-700 capitalize">{doc.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-amber-700">Nota: estas casillas son una lista de verificación; los archivos y sus evidencias no se almacenan en la base de datos en esta versión.</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={guardandoSolicitud} className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg shadow disabled:opacity-60 disabled:cursor-not-allowed">{guardandoSolicitud ? 'Guardando...' : 'Registrar Solicitud Oficial'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}