import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { 
  Users, UserPlus, Search, Edit2, ShieldAlert, 
  CheckCircle2, X, Phone, Mail, MapPin, Briefcase, 
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientesPage() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [notificacion, setNotificacion] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [modoModal, setModoModal] = useState('REGISTRAR'); 
  const [clienteIdEditing, setClienteIdEditing] = useState(null);

  // Formulario sincronizado 1:1 con la tabla public.cliente de PostgreSQL
  const formInicial = {
    ci: '',
    expedido: 'LP',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    estado_civil: 'SOLTERO/A',
    profesion_ocupacion: '',
    ingresos_fijos: '0.00',
    ingresos_variables: '0.00',
    direccion_domicilio: '',
    telefono_contacto: '',
    correo: ''
  };

  const [formData, setFormData] = useState(formInicial);

  const mostrarNotificacion = (tipo, titulo, mensaje) => {
    setNotificacion({ tipo, titulo, mensaje });
    setTimeout(() => setNotificacion(null), 5000);
  };

  useEffect(() => {
    let activo = true;

    const cargarClientes = async () => {
      setCargando(true);
      setErrorCarga('');
      try {
        const response = await api.get('/clientes');
        if (activo) {
          setClientes(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        const mensaje = error.response?.data?.error ||
          'No fue posible consultar los clientes. Verifique la conexión y sus permisos.';
        if (activo) {
          setErrorCarga(mensaje);
          mostrarNotificacion('error', 'Error al cargar clientes', mensaje);
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarClientes();
    return () => { activo = false; };
  }, []);

  const clientesFiltrados = clientes.filter(c => {
    const texto = busqueda.toLocaleLowerCase();
    return String(c.ci || '').toLocaleLowerCase().includes(texto) ||
      String(c.nombres || '').toLocaleLowerCase().includes(texto) ||
      String(c.apellidos || '').toLocaleLowerCase().includes(texto);
  });

  const handleOpenRegistrar = () => {
    setModoModal('REGISTRAR');
    setFormData(formInicial);
    setClienteIdEditing(null);
    setShowModal(true);
  };

  const handleOpenEditar = (cliente) => {
    setModoModal('EDITAR');
    setClienteIdEditing(cliente.id_cliente);
    setFormData({
      ci: cliente.ci,
      expedido: cliente.expedido || 'LP',
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.substring(0, 10) : '',
      estado_civil: cliente.estado_civil || 'SOLTERO/A',
      profesion_ocupacion: cliente.profesion_ocupacion || '',
      ingresos_fijos: cliente.ingresos_fijos || '0.00',
      ingresos_variables: cliente.ingresos_variables || '0.00',
      direccion_domicilio: cliente.direccion_domicilio || '',
      telefono_contacto: cliente.telefono_contacto || '',
      correo: cliente.correo || ''
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (guardando) return;

    if (!formData.ci.trim() || !formData.nombres.trim() || !formData.apellidos.trim() || !formData.fecha_nacimiento) {
      mostrarNotificacion('error', 'Excepción CU01: Datos incompletos', 'CI, nombres, apellidos y fecha de nacimiento son obligatorios.');
      return;
    }

    const ingFijos = Number(formData.ingresos_fijos || 0);
    const ingVar = Number(formData.ingresos_variables || 0);
    if (!Number.isFinite(ingFijos) || !Number.isFinite(ingVar) || ingFijos < 0 || ingVar < 0) {
      mostrarNotificacion('error', 'Ingresos inválidos', 'Los ingresos fijos y variables deben ser importes válidos mayores o iguales a cero.');
      return;
    }

    if (modoModal === 'REGISTRAR' && clientes.some(c => String(c.ci || '').trim() === formData.ci.trim())) {
      mostrarNotificacion('error', 'CI duplicado', `El CI ${formData.ci} ya figura en la lista cargada. El backend también verificará la unicidad.`);
      return;
    }

    const payload = {
      ci: formData.ci.trim(),
      expedido: formData.expedido || null,
      nombres: formData.nombres.trim(),
      apellidos: formData.apellidos.trim(),
      fecha_nacimiento: formData.fecha_nacimiento,
      estado_civil: formData.estado_civil || null,
      profesion_ocupacion: formData.profesion_ocupacion.trim() || null,
      ingresos_fijos: ingFijos,
      ingresos_variables: ingVar,
      direccion_domicilio: formData.direccion_domicilio.trim() || null,
      telefono_contacto: formData.telefono_contacto.trim() || null,
      correo: formData.correo.trim() || null,
    };

    setGuardando(true);
    try {
      if (modoModal === 'REGISTRAR') {
        const response = await api.post('/clientes', payload);
        const nuevoCliente = response.data;
        setClientes(actuales => [nuevoCliente, ...actuales]);
        mostrarNotificacion('success', 'Cliente registrado (CU01)', `Se registró a ${nuevoCliente.nombres} ${nuevoCliente.apellidos} en la base de datos.`);
      } else {
        const response = await api.put(`/clientes/${clienteIdEditing}`, payload);
        const clienteActualizado = response.data;
        setClientes(actuales => actuales.map(c =>
          Number(c.id_cliente) === Number(clienteIdEditing) ? clienteActualizado : c
        ));
        mostrarNotificacion('success', 'Cliente actualizado (RF02)', `Se actualizaron los datos de ${clienteActualizado.nombres} ${clienteActualizado.apellidos}.`);
      }
      setErrorCarga('');
      setShowModal(false);
    } catch (error) {
      const mensaje = error.response?.data?.error ||
        'No fue posible guardar el cliente. Verifique el servidor e inténtelo nuevamente.';
      mostrarNotificacion('error', 'No se pudo guardar el cliente', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* NOTIFICACIONES TOAST */}
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
            <button onClick={() => setNotificacion(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER DE MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-800" />
            <h1 className="text-xl font-bold text-slate-800">Clientes (CU01 / RF02)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">Gestión de datos mapeados a la tabla <code>public.cliente</code>.</p>
        </div>

        <button
          onClick={handleOpenRegistrar}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Cliente (CU01)
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar por C.I., Nombres o Apellidos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full text-sm border-none focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Identificación (ci / expedido)</th>
                <th className="p-4">Cliente / Ocupación</th>
                <th className="p-4">Contacto & Domicilio</th>
                <th className="p-4">Ingresos (Fijos / Var.)</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cargando ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Cargando clientes...</td></tr>
              ) : clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((c) => (
                  <tr key={c.id_cliente} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-semibold text-slate-900">
                      {c.ci} {c.expedido && <span className="text-slate-400 text-xs">({c.expedido})</span>}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{c.nombres} {c.apellidos}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        {c.profesion_ocupacion || 'Sin ocupación'} | <span className="text-slate-400">{c.estado_civil}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {c.telefono_contacto || 'Sin teléfono'}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {c.correo || 'Sin correo'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">Bs. {parseFloat(c.ingresos_fijos || 0).toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400">Var: Bs. {parseFloat(c.ingresos_variables || 0).toLocaleString()}</div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditar(c)}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => navigate('/solicitudes')}
                        className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Solicitud
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 text-sm">
                    {errorCarga ? `No se pudieron cargar los clientes: ${errorCarga}` : "No existen clientes registrados que coincidan con la búsqueda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORMULARIO */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-3xl my-0 sm:my-auto relative flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center rounded-t-2xl sm:rounded-t-xl z-10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  {modoModal === 'REGISTRAR' ? 'Registrar Cliente (CU01)' : 'Actualizar Cliente (RF02)'}
                </h2>
                <p className="text-xs text-slate-500">Formulario alineado con el esquema <code>public.cliente</code></p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              
              {/* DATOS PERSONALES */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">1. Datos Personales</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Carnet de Identidad (ci) *</label>
                    <input
                      type="text"
                      name="ci"
                      value={formData.ci}
                      onChange={handleChange}
                      readOnly={modoModal === 'EDITAR'}
                      placeholder="Ej. 4521378"
                      className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 ${
                        modoModal === 'EDITAR' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Expedido (expedido)</label>
                    <select
                      name="expedido"
                      value={formData.expedido}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                    >
                      <option value="LP">LP (La Paz)</option>
                      <option value="CB">CB (Cochabamba)</option>
                      <option value="SC">SC (Santa Cruz)</option>
                      <option value="OR">OR (Oruro)</option>
                      <option value="PT">PT (Potosí)</option>
                      <option value="TJ">TJ (Tarija)</option>
                      <option value="CH">CH (Chuquisaca)</option>
                      <option value="BN">BN (Beni)</option>
                      <option value="PD">PD (Pando)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nombres *</label>
                    <input
                      type="text"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleChange}
                      placeholder="Ej. Maria Elena"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Apellidos *</label>
                    <input
                      type="text"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleChange}
                      placeholder="Ej. Quispe Condori"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fecha Nacimiento *</label>
                    <input
                      type="date"
                      name="fecha_nacimiento"
                      value={formData.fecha_nacimiento}
                      onChange={handleChange}
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Estado Civil</label>
                    <select
                      name="estado_civil"
                      value={formData.estado_civil}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 bg-white"
                    >
                      <option value="SOLTERO/A">Soltero/a</option>
                      <option value="CASADO/A">Casado/a</option>
                      <option value="DIVORCIADO/A">Divorciado/a</option>
                      <option value="VIUDO/A">Viudo/a</option>
                      <option value="UNION LIBRE">Unión Libre</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Profesión / Ocupación</label>
                    <input
                      type="text"
                      name="profesion_ocupacion"
                      value={formData.profesion_ocupacion}
                      onChange={handleChange}
                      placeholder="Ej. Comerciante Minorista"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* CONTACTO Y DOMICILIO */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">2. Ubicación y Contacto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Teléfono/Celular</label>
                    <input
                      type="text"
                      name="telefono_contacto"
                      value={formData.telefono_contacto}
                      onChange={handleChange}
                      placeholder="Ej. 71524300"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleChange}
                      placeholder="cliente@correo.com"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Dirección Domicilio</label>
                    <input
                      type="text"
                      name="direccion_domicilio"
                      value={formData.direccion_domicilio}
                      onChange={handleChange}
                      placeholder="Ej. Av. 6 de Marzo Nro 1230, El Alto"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* INFORMACIÓN FINANCIERA */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">3. Evaluación de Ingresos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ingresos Fijos (Bs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="ingresos_fijos"
                      value={formData.ingresos_fijos}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ingresos Variables (Bs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="ingresos_variables"
                      value={formData.ingresos_variables}
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {guardando ? 'Guardando...' : modoModal === 'REGISTRAR' ? 'Guardar Cliente (CU01)' : 'Guardar Cambios (RF02)'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}