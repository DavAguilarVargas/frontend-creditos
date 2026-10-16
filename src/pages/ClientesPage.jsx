import React, { useState, useEffect } from 'react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { Users, UserPlus, Search, Shield, Edit3, PlusCircle } from 'lucide-react';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [isModalClienteOpen, setIsModalClienteOpen] = useState(false);
  const [isModalGarantiaOpen, setIsModalGarantiaOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Formulario Cliente
  const [formCliente, setFormCliente] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    ci: '',
    telefono: '',
    email: '',
    direccion: '',
    ingreso_mensual: ''
  });

  // Formulario Garantía
  const [formGarantia, setFormGarantia] = useState({
    tipo_garantia: 'HIPOTECARIA',
    descripcion: '',
    valor_estimado: ''
  });

  const cargarClientes = async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    try {
      if (clienteSeleccionado) {
        await api.put(`/clientes/${clienteSeleccionado.id_cliente}`, formCliente);
        Swal.fire('Éxito', 'Cliente actualizado correctamente', 'success');
      } else {
        await api.post('/clientes', formCliente);
        Swal.fire('Éxito', 'Cliente registrado correctamente', 'success');
      }
      setIsModalClienteOpen(false);
      resetFormCliente();
      cargarClientes();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Error al guardar cliente', 'error');
    }
  };

  const handleGuardarGarantia = async (e) => {
    e.preventDefault();
    try {
      await api.post('/garantias', {
        id_cliente: clienteSeleccionado.id_cliente,
        ...formGarantia,
        valor_estimado: parseFloat(formGarantia.valor_estimado)
      });
      Swal.fire('Éxito', 'Garantía registrada y vinculada al cliente', 'success');
      setIsModalGarantiaOpen(false);
      setFormGarantia({ tipo_garantia: 'HIPOTECARIA', descripcion: '', valor_estimado: '' });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Error al registrar garantía', 'error');
    }
  };

  const resetFormCliente = () => {
    setClienteSeleccionado(null);
    setFormCliente({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      ci: '',
      telefono: '',
      email: '',
      direccion: '',
      ingreso_mensual: ''
    });
  };

  const abrirEditar = (cliente) => {
    setClienteSeleccionado(cliente);
    setFormCliente({
      nombre: cliente.nombre || '',
      apellido_paterno: cliente.apellido_paterno || '',
      apellido_materno: cliente.apellido_materno || '',
      ci: cliente.ci || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      ingreso_mensual: cliente.ingreso_mensual || ''
    });
    setIsModalClienteOpen(true);
  };

  const clientesFiltrados = clientes.filter(c =>
    `${c.nombre} ${c.apellido_paterno} ${c.ci}`.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Barra de Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nombre o CI..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <button
          onClick={() => {
            resetFormCliente();
            setIsModalClienteOpen(true);
          }}
          className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {/* Tabla de Clientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" /> Cartera de Clientes ({clientesFiltrados.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs">
                <th className="p-4">CI / Documento</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Ingreso Declarado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clientesFiltrados.map((c) => (
                <tr key={c.id_cliente} className="hover:bg-slate-50">
                  <td className="p-4 font-semibold text-slate-900">{c.ci}</td>
                  <td className="p-4 font-medium">{c.nombre} {c.apellido_paterno} {c.apellido_materno}</td>
                  <td className="p-4 text-xs text-slate-600">
                    <div>{c.telefono || 'Sin teléfono'}</div>
                    <div className="text-slate-400">{c.email || 'Sin correo'}</div>
                  </td>
                  <td className="p-4 font-semibold text-emerald-600">${c.ingreso_mensual || '0.00'}</td>
                  <td className="p-4 flex justify-center gap-2">
                    <button
                      onClick={() => abrirEditar(c)}
                      title="Editar Cliente"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setClienteSeleccionado(c);
                        setIsModalGarantiaOpen(true);
                      }}
                      title="Añadir Garantía"
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded transition flex items-center gap-1 text-xs font-semibold px-2.5"
                    >
                      <Shield className="w-4 h-4" /> Garantía
                    </button>
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar/Editar Cliente */}
      <Modal
        isOpen={isModalClienteOpen}
        onClose={() => setIsModalClienteOpen(false)}
        title={clienteSeleccionado ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
      >
        <form onSubmit={handleGuardarCliente} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">C.I. / Documento *</label>
              <input
                type="text"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formCliente.ci}
                onChange={(e) => setFormCliente({ ...formCliente, ci: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombres *</label>
              <input
                type="text"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formCliente.nombre}
                onChange={(e) => setFormCliente({ ...formCliente, nombre: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Apellido Paterno *</label>
              <input
                type="text"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formCliente.apellido_paterno}
                onChange={(e) => setFormCliente({ ...formCliente, apellido_paterno: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Apellido Materno</label>
              <input
                type="text"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formCliente.apellido_materno}
                onChange={(e) => setFormCliente({ ...formCliente, apellido_materno: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono</label>
              <input
                type="text"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formCliente.telefono}
                onChange={(e) => setFormCliente({ ...formCliente, telefono: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Ingreso Mensual ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formCliente.ingreso_mensual}
                onChange={(e) => setFormCliente({ ...formCliente, ingreso_mensual: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Correo Electrónico</label>
            <input
              type="email"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              value={formCliente.email}
              onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalClienteOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold shadow"
            >
              {clienteSeleccionado ? 'Actualizar' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Añadir Garantía */}
      <Modal
        isOpen={isModalGarantiaOpen}
        onClose={() => setIsModalGarantiaOpen(false)}
        title={`Registrar Garantía para: ${clienteSeleccionado?.nombre} ${clienteSeleccionado?.apellido_paterno}`}
      >
        <form onSubmit={handleGuardarGarantia} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tipo de Garantía *</label>
            <select
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
              value={formGarantia.tipo_garantia}
              onChange={(e) => setFormGarantia({ ...formGarantia, tipo_garantia: e.target.value })}
            >
              <option value="HIPOTECARIA">Hipotecaria (Inmueble / Bien Raíz)</option>
              <option value="PRENDARIA">Prendaria (Vehículo / Maquinaria)</option>
              <option value="PERSONAL">Personal / Garante Solidario</option>
              <option value="DEPOSITO_PLAZO">Depósito a Plazo Fijo (DPF)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Valor Estimado ($) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              value={formGarantia.valor_estimado}
              onChange={(e) => setFormGarantia({ ...formGarantia, valor_estimado: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Descripción / Detalles *</label>
            <textarea
              required
              rows="3"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              placeholder="Ej. Casa de 2 plantas ubicada en Av. Principal #123, Titulo Folio Real 102938..."
              value={formGarantia.descripcion}
              onChange={(e) => setFormGarantia({ ...formGarantia, descripcion: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalGarantiaOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow"
            >
              Registrar Garantía
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}