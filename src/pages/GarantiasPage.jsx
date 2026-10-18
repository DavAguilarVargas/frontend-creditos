import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Building,
  Car,
  UserCheck,
  CheckCircle2,
  ShieldAlert,
  X,
  RefreshCw,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/axios';

const TIPOS_GARANTIA = [
  { value: 'HIPOTECARIA', label: 'HIPOTECARIA (Inmueble/Lote)' },
  { value: 'PRENDARIA', label: 'PRENDARIA (Vehículo/Maquinaria)' },
  { value: 'PERSONAL', label: 'PERSONAL (Garante/Respaldo personal)' },
  { value: 'DPF', label: 'DPF (Depósito a Plazo Fijo)' },
];

const ESTADOS_SOLICITUD_PERMITIDOS = new Set(['REGISTRADA', 'EN_EVALUACION']);

const FORM_INICIAL = {
  id_solicitud: '',
  tipo_garantia: 'HIPOTECARIA',
  descripcion: '',
  valor_avaluo: '',
  documento_respaldo_url: '',
};

const formatearImporte = (valor) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '0,00';
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
};

const normalizarGarantia = (garantia) => ({
  ...garantia,
  cliente:
    garantia.cliente ||
    [garantia.nombres, garantia.apellidos].filter(Boolean).join(' ') ||
    'Cliente no disponible',
  ci_cliente: garantia.ci_cliente || garantia.ci || '',
  valor_avaluo: Number(garantia.valor_avaluo ?? 0),
  tipo_garantia: String(garantia.tipo_garantia || '').toUpperCase(),
  estado: String(garantia.estado || 'VIGENTE').toUpperCase(),
});

const normalizarSolicitud = (solicitud) => ({
  ...solicitud,
  cliente: [solicitud.nombres, solicitud.apellidos].filter(Boolean).join(' ') || 'Cliente no disponible',
  ci_cliente: solicitud.ci || '',
});

export default function GarantiasPage() {
  const [garantias, setGarantias] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [liberandoId, setLiberandoId] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [formData, setFormData] = useState(FORM_INICIAL);

  const mostrarNotificacion = useCallback((tipo, titulo, mensaje) => {
    setNotificacion({ tipo, titulo, mensaje });
  }, []);

  const cargarDatos = useCallback(async ({ silencioso = false } = {}) => {
    if (silencioso) setRecargando(true);
    else setCargando(true);
    setErrorCarga('');

    try {
      const [garantiasResponse, solicitudesResponse] = await Promise.all([
        api.get('/garantias'),
        api.get('/solicitudes'),
      ]);

      const garantiasData = Array.isArray(garantiasResponse.data)
        ? garantiasResponse.data.map(normalizarGarantia)
        : [];
      const solicitudesData = Array.isArray(solicitudesResponse.data)
        ? solicitudesResponse.data.map(normalizarSolicitud)
        : [];

      setGarantias(garantiasData);
      setSolicitudes(
        solicitudesData.filter((solicitud) =>
          ESTADOS_SOLICITUD_PERMITIDOS.has(String(solicitud.estado || '').toUpperCase())
        )
      );
    } catch (error) {
      console.error('Error al cargar garantías y solicitudes:', error);
      const mensaje = error.response?.data?.error ||
        'No fue posible cargar las garantías. Verifique la conexión con el servidor y sus permisos.';
      setErrorCarga(mensaje);
      mostrarNotificacion('error', 'Error de consulta', mensaje);
    } finally {
      setCargando(false);
      setRecargando(false);
    }
  }, [mostrarNotificacion]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleOpenModal = () => {
    if (solicitudes.length === 0) {
      mostrarNotificacion(
        'warning',
        'No hay solicitudes disponibles',
        'Para registrar una garantía debe existir una solicitud en estado REGISTRADA o EN_EVALUACION.'
      );
      return;
    }

    setFormData(FORM_INICIAL);
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((actual) => ({ ...actual, [name]: value }));
  };

  const solicitudSeleccionada = useMemo(
    () => solicitudes.find((solicitud) => Number(solicitud.id_solicitud) === Number(formData.id_solicitud)),
    [solicitudes, formData.id_solicitud]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (guardando) return;

    const idSolicitud = Number(formData.id_solicitud);
    const descripcion = formData.descripcion.trim();
    const avaluo = Number(formData.valor_avaluo);
    const tipo = String(formData.tipo_garantia || '').toUpperCase();

    if (!Number.isInteger(idSolicitud) || idSolicitud <= 0 || !solicitudSeleccionada) {
      mostrarNotificacion('error', 'Excepción CU06', 'Seleccione una solicitud válida.');
      return;
    }

    if (!TIPOS_GARANTIA.some((item) => item.value === tipo)) {
      mostrarNotificacion('error', 'Tipo de garantía inválido', 'Seleccione un tipo de garantía de la lista.');
      return;
    }

    if (!descripcion) {
      mostrarNotificacion('error', 'Excepción CU06', 'La descripción de la garantía es obligatoria.');
      return;
    }

    if (formData.valor_avaluo === '' || !Number.isFinite(avaluo) || avaluo < 0) {
      mostrarNotificacion('error', 'Avalúo inválido', 'Ingrese un valor de avalúo igual o superior a Bs 0,00.');
      return;
    }

    const documento = formData.documento_respaldo_url.trim();
    if (documento) {
      try {
        const parsed = new URL(documento);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Esquema inválido');
      } catch {
        mostrarNotificacion('error', 'Referencia documental inválida', 'Ingrese una URL completa que comience con https:// o http://.');
        return;
      }
    }

    setGuardando(true);
    try {
      const response = await api.post('/garantias', {
        id_solicitud: idSolicitud,
        tipo_garantia: tipo,
        descripcion,
        valor_avaluo: avaluo,
        documento_respaldo_url: documento || null,
      });

      const nuevaGarantia = response.data?.garantia;
      if (!nuevaGarantia?.id_garantia) {
        await cargarDatos({ silencioso: true });
      } else {
        const normalizada = normalizarGarantia(nuevaGarantia);
        setGarantias((actuales) => [
          normalizada,
          ...actuales.filter((item) => item.id_garantia !== normalizada.id_garantia),
        ]);
      }

      mostrarNotificacion(
        'success',
        'Garantía registrada',
        response.data?.mensaje || `La garantía ${tipo} se registró correctamente.`
      );
      setShowModal(false);
      setFormData(FORM_INICIAL);
    } catch (error) {
      console.error('Error al registrar garantía:', error);
      mostrarNotificacion(
        'error',
        'No se pudo registrar la garantía',
        error.response?.data?.error || 'Ocurrió un error al guardar la garantía. No se han mostrado datos ficticios.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (idGarantia) => {
    if (liberandoId !== null) return;

    const confirmacion = window.confirm(
      '¿Desea solicitar la liberación de esta garantía? El servidor verificará que el crédito esté cancelado y el saldo de capital sea cero.'
    );
    if (!confirmacion) return;

    setLiberandoId(idGarantia);
    try {
      const response = await api.patch(`/garantias/${idGarantia}/estado`, {});
      const garantiaActualizada = response.data?.garantia;

      if (garantiaActualizada) {
        const normalizada = normalizarGarantia(garantiaActualizada);
        setGarantias((actuales) => actuales.map((garantia) =>
          garantia.id_garantia === idGarantia ? normalizada : garantia
        ));
      } else {
        await cargarDatos({ silencioso: true });
      }

      mostrarNotificacion(
        'success',
        'Estado actualizado',
        response.data?.mensaje || `La garantía N.º ${idGarantia} fue liberada.`
      );
    } catch (error) {
      console.error('Error al liberar garantía:', error);
      mostrarNotificacion(
        'error',
        'No se pudo liberar la garantía',
        error.response?.data?.error || 'El servidor no pudo completar la operación.'
      );
    } finally {
      setLiberandoId(null);
    }
  };

  const garantiasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase();
    if (!texto) return garantias;

    return garantias.filter((garantia) => [
      garantia.cliente,
      garantia.ci_cliente,
      garantia.tipo_garantia,
      garantia.descripcion,
      String(garantia.id_solicitud),
      String(garantia.id_garantia),
    ].some((campo) => String(campo || '').toLocaleLowerCase().includes(texto)));
  }, [garantias, busqueda]);

  const iconoTipoGarantia = (tipo) => {
    if (tipo === 'HIPOTECARIA') return <Building className="h-3.5 w-3.5" />;
    if (tipo === 'PRENDARIA') return <Car className="h-3.5 w-3.5" />;
    if (tipo === 'PERSONAL') return <UserCheck className="h-3.5 w-3.5" />;
    return <FileText className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-6">
      {/* TOAST / NOTIFICACIONES */}
      {notificacion && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-50">
          <div className={`rounded-xl p-4 shadow-2xl border bg-slate-900 text-white flex items-start gap-3 ${
            notificacion.tipo === 'success'
              ? 'border-emerald-500'
              : notificacion.tipo === 'warning'
                ? 'border-amber-500'
                : 'border-rose-500'
          }`}>
            <div className="mt-0.5 shrink-0">
              {notificacion.tipo === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : notificacion.tipo === 'warning' ? (
                <AlertCircle className="h-5 w-5 text-amber-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-rose-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold">{notificacion.titulo}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{notificacion.mensaje}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotificacion(null)}
              aria-label="Cerrar notificación"
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-800">Gestión de Garantías (CU06 / RF07 / RN13)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registros persistidos en <code>public.garantia</code>, asociados a solicitudes reales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => cargarDatos({ silencioso: true })}
            disabled={recargando || cargando}
            className="flex items-center justify-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
          >
            {recargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Registrar garantía
          </button>
        </div>
      </div>

      {/* ERROR DE CARGA */}
      {errorCarga && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">No se pudieron cargar los datos</p>
            <p className="text-sm mt-1">{errorCarga}</p>
          </div>
          <button
            type="button"
            onClick={() => cargarDatos()}
            className="text-sm font-semibold underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* BUSCADOR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar por solicitud, cliente, CI, tipo o descripción..."
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          className="w-full text-sm border-none focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* TABLA DE GARANTÍAS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Solicitud / Cliente</th>
                <th className="p-4">Tipo de garantía</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Valor de avalúo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cargando ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando garantías desde el servidor...
                    </span>
                  </td>
                </tr>
              ) : garantiasFiltradas.length > 0 ? (
                garantiasFiltradas.map((garantia) => (
                  <tr key={garantia.id_garantia} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-700 rounded mb-1 font-semibold">
                        SOL-#{garantia.id_solicitud}
                      </span>
                      <div className="font-semibold text-slate-900">{garantia.cliente}</div>
                      {garantia.ci_cliente && (
                        <div className="text-xs text-slate-500">CI: {garantia.ci_cliente}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                        garantia.tipo_garantia === 'HIPOTECARIA'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : garantia.tipo_garantia === 'PRENDARIA'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : garantia.tipo_garantia === 'PERSONAL'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {iconoTipoGarantia(garantia.tipo_garantia)}
                        {garantia.tipo_garantia}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="font-medium text-slate-800 leading-snug whitespace-pre-wrap">{garantia.descripcion}</div>
                      {garantia.documento_respaldo_url && (
                        <a
                          href={garantia.documento_respaldo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-blue-700 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> Ver referencia documental
                        </a>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                      Bs. {formatearImporte(garantia.valor_avaluo)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        garantia.estado === 'VIGENTE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : garantia.estado === 'LIBERADA'
                            ? 'bg-slate-100 text-slate-600 border border-slate-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {garantia.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {garantia.estado === 'VIGENTE' ? (
                        <button
                          type="button"
                          onClick={() => handleCambiarEstado(garantia.id_garantia)}
                          disabled={liberandoId !== null}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          {liberandoId === garantia.id_garantia
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <RefreshCw className="h-3.5 w-3.5" />}
                          Solicitar liberación
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Garantía finalizada</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 text-sm">
                    {errorCarga
                      ? 'No se puede mostrar la información hasta recuperar la conexión.'
                      : busqueda
                        ? 'No se encontraron garantías para la búsqueda.'
                        : 'No existen garantías registradas en la base de datos.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR GARANTÍA */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl my-0 sm:my-auto relative flex flex-col max-h-[92vh]">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center rounded-t-2xl sm:rounded-t-xl z-10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">Registrar garantía · CU06 / RF07</h2>
                <p className="text-xs text-slate-500">Los datos se guardarán en <code>public.garantia</code>.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Cerrar formulario"
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label htmlFor="id_solicitud" className="block text-xs font-medium text-slate-700 mb-1">
                  Solicitud asociada *
                </label>
                <select
                  id="id_solicitud"
                  name="id_solicitud"
                  value={formData.id_solicitud}
                  onChange={handleChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Seleccione solicitud --</option>
                  {solicitudes.map((solicitud) => (
                    <option key={solicitud.id_solicitud} value={solicitud.id_solicitud}>
                      SOL-#{solicitud.id_solicitud} | {solicitud.cliente} | CI {solicitud.ci_cliente || 'N/D'} | Bs. {formatearImporte(solicitud.monto_solicitado)}
                    </option>
                  ))}
                </select>
                {solicitudSeleccionada && (
                  <p className="mt-2 text-xs text-slate-500">
                    Estado: <strong>{solicitudSeleccionada.estado}</strong>
                    {solicitudSeleccionada.destino_credito ? ` · Destino: ${solicitudSeleccionada.destino_credito}` : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tipo_garantia" className="block text-xs font-medium text-slate-700 mb-1">
                    Tipo de garantía *
                  </label>
                  <select
                    id="tipo_garantia"
                    name="tipo_garantia"
                    value={formData.tipo_garantia}
                    onChange={handleChange}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {TIPOS_GARANTIA.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="valor_avaluo" className="block text-xs font-medium text-slate-700 mb-1">
                    Valor de avalúo (Bs.) *
                  </label>
                  <input
                    id="valor_avaluo"
                    type="number"
                    min="0"
                    step="0.01"
                    name="valor_avaluo"
                    value={formData.valor_avaluo}
                    onChange={handleChange}
                    placeholder="Ej. 120000.00"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="descripcion" className="block text-xs font-medium text-slate-700 mb-1">
                  Descripción de la garantía *
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows="4"
                  maxLength={5000}
                  placeholder="Describa el bien, sus características y la documentación o verificación pertinente. Para garantías personales, indique la información necesaria en el marco de las políticas de privacidad institucionales."
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{formData.descripcion.length}/5000</p>
              </div>

              <div>
                <label htmlFor="documento_respaldo_url" className="block text-xs font-medium text-slate-700 mb-1">
                  URL del documento de respaldo (opcional)
                </label>
                <input
                  id="documento_respaldo_url"
                  type="url"
                  name="documento_respaldo_url"
                  value={formData.documento_respaldo_url}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Este campo registra una referencia URL; no carga archivos ni verifica por sí mismo la autenticidad del documento.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={guardando}
                  className="px-5 py-2.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow disabled:opacity-50"
                >
                  {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                  {guardando ? 'Guardando...' : 'Guardar garantía'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
