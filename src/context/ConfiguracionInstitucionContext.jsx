import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/axios';

const DEFAULT_CONFIG = {
  id: null,
  razon_social: '',
  nit: '',
  direccion: '',
  telefono: '',
  moneda_base: 'BOB',
  tasa_interes_penal_diaria: '0.0010',
  url_logo: '',
  color_primario: '#0F172A',
  color_secundario: '#0369A1',
  color_acento: '#0EA5E9',
  correo_contacto: '',
  sitio_web: '',
  domicilio_legal: '',
  representante_legal: '',
  documento_representante: '',
  cargo_representante: '',
  referencia_facultades: '',
};

const Context = createContext(null);
const validHex = (value, fallback) => /^#[0-9A-Fa-f]{6}$/.test(String(value || '')) ? value : fallback;

function normalizarConfiguracion(value = {}) {
  // Mantener solo propiedades de identidad pública dentro del contexto compartido.
  // Los documentos identificativos y las facultades se consultan en el endpoint ADMIN.
  return {
    id: value.id ?? null,
    razon_social: value.razon_social ?? '',
    nit: value.nit ?? '',
    direccion: value.direccion ?? '',
    telefono: value.telefono ?? '',
    moneda_base: value.moneda_base || 'BOB',
    tasa_interes_penal_diaria: value.tasa_interes_penal_diaria ?? '0.0010',
    url_logo: value.url_logo ?? '',
    color_primario: validHex(value.color_primario, DEFAULT_CONFIG.color_primario),
    color_secundario: validHex(value.color_secundario, DEFAULT_CONFIG.color_secundario),
    color_acento: validHex(value.color_acento, DEFAULT_CONFIG.color_acento),
    correo_contacto: value.correo_contacto ?? '',
    sitio_web: value.sitio_web ?? '',
  };
}

export function ConfiguracionInstitucionProvider({ children }) {
  const [configuracion, setConfiguracion] = useState(DEFAULT_CONFIG);
  const [cargandoConfiguracion, setCargandoConfiguracion] = useState(true);
  const [errorConfiguracion, setErrorConfiguracion] = useState('');

  const cargarConfiguracion = useCallback(async () => {
    setCargandoConfiguracion(true);
    setErrorConfiguracion('');
    try {
      const response = await api.get('/configuracion-institucion');
      const data = response.data?.configuracion || response.data || {};
      const next = normalizarConfiguracion(data);
      setConfiguracion(next);
      return next;
    } catch (error) {
      const message = error.response?.data?.error || 'No se pudo cargar la identidad institucional.';
      setErrorConfiguracion(message);
      // No bloquear el sistema completo si configuración no está disponible.
      return DEFAULT_CONFIG;
    } finally {
      setCargandoConfiguracion(false);
    }
  }, []);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  // Publicar los colores institucionales como variables globales para todas las páginas,
  // incluidos los botones que conservan clases Tailwind neutrales en los componentes existentes.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', configuracion.color_primario || DEFAULT_CONFIG.color_primario);
    root.style.setProperty('--brand-secondary', configuracion.color_secundario || DEFAULT_CONFIG.color_secundario);
    root.style.setProperty('--brand-accent', configuracion.color_acento || DEFAULT_CONFIG.color_acento);
  }, [configuracion.color_primario, configuracion.color_secundario, configuracion.color_acento]);

  const guardarConfiguracion = useCallback(async (payload) => {
    const response = await api.put('/configuracion-institucion', payload);
    const data = response.data?.configuracion || response.data || {};
    const next = normalizarConfiguracion(data);
    setConfiguracion(next);
    setErrorConfiguracion('');
    return next;
  }, []);

  const value = useMemo(() => ({
    configuracion,
    cargandoConfiguracion,
    errorConfiguracion,
    cargarConfiguracion,
    guardarConfiguracion,
  }), [configuracion, cargandoConfiguracion, errorConfiguracion, cargarConfiguracion, guardarConfiguracion]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useConfiguracionInstitucion() {
  const value = useContext(Context);
  if (!value) throw new Error('useConfiguracionInstitucion debe usarse dentro de ConfiguracionInstitucionProvider.');
  return value;
}
