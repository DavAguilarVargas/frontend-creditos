import React, { useState, useEffect } from 'react';
import { api } from '../api/axios';
import Swal from 'sweetalert2';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { UserCog, UserPlus, Shield, CheckCircle, XCircle } from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formUsuario, setFormUsuario] = useState({
    login: '',
    clave: '',
    nombre: '',
    rol: 'OFICIAL'
  });

  const cargarUsuarios = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    try {
      await api.post('/usuarios', formUsuario);
      Swal.fire('Usuario Creado', 'Nuevo usuario registrado con éxito.', 'success');
      setIsModalOpen(false);
      setFormUsuario({ login: '', clave: '', nombre: '', rol: 'OFICIAL' });
      cargarUsuarios();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Error al crear usuario', 'error');
    }
  };

  const toggleEstadoUsuario = async (idUsuario, estadoActual) => {
    try {
      await api.patch(`/usuarios/${idUsuario}/estado`, { activo: !estadoActual });
      Swal.fire('Estado Actualizado', 'El estado del usuario ha sido modificado.', 'info');
      cargarUsuarios();
    } catch (err) {
      Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Administración de Usuarios y Permisos</h3>
          <p className="text-xs text-slate-500">Control de Acceso Basado en Roles (RBAC)</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" /> Crear Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <UserCog className="w-5 h-5 text-sky-600" /> Usuarios Registrados
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs">
                <th className="p-4">Login / Usuario</th>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usuarios.map((u) => (
                <tr key={u.id_usuario} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{u.login}</td>
                  <td className="p-4 font-medium">{u.nombre}</td>
                  <td className="p-4">
                    <Badge variant="indigo">{u.rol}</Badge>
                  </td>
                  <td className="p-4">
                    {u.activo ? (
                      <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Activo
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold text-xs flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleEstadoUsuario(u.id_usuario, u.activo)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        u.activo ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nuevo Usuario del Sistema"
      >
        <form onSubmit={handleCrearUsuario} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              value={formUsuario.nombre}
              onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Login / Usuario *</label>
              <input
                type="text"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formUsuario.login}
                onChange={(e) => setFormUsuario({ ...formUsuario, login: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contraseña *</label>
              <input
                type="password"
                required
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                value={formUsuario.clave}
                onChange={(e) => setFormUsuario({ ...formUsuario, clave: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Rol Operativo *</label>
            <select
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white"
              value={formUsuario.rol}
              onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}
            >
              <option value="OFICIAL">OFICIAL (Oficial de Crédito)</option>
              <option value="ANALISTA">ANALISTA (Analista de Riesgo)</option>
              <option value="JEFE">JEFE (Jefe de Créditos / Aprobador)</option>
              <option value="CAJERO">CAJERO (Operador de Ventanilla/Cobranza)</option>
              <option value="GERENTE">GERENTE (Gerencia / Reportes)</option>
              <option value="ADMIN">ADMIN (Administrador de Sistema)</option>
            </select>
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
              Guardar Usuario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}