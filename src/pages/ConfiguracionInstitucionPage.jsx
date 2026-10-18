import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Save, RefreshCw, Palette, Image as ImageIcon, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/axios';
import { useConfiguracionInstitucion } from '../context/ConfiguracionInstitucionContext';

const EMPTY = {
  razon_social: '', nit: '', direccion: '', telefono: '', moneda_base: 'BOB',
  tasa_interes_penal_diaria: '0.0010', url_logo: '',
  color_primario: '#0F172A', color_secundario: '#0369A1', color_acento: '#0EA5E9',
  correo_contacto: '', sitio_web: '', domicilio_legal: '', representante_legal: '',
  documento_representante: '', cargo_representante: '', referencia_facultades: '',
};

const FIELDS_TEXT = [
  ['razon_social', 'Razón social *', 'Ej. Entidad Financiera Ejemplo S.A.'],
  ['nit', 'NIT *', 'Número de identificación tributaria'],
  ['direccion', 'Dirección de atención', 'Dirección institucional'],
  ['telefono', 'Teléfono de contacto', 'Teléfono institucional'],
  ['correo_contacto', 'Correo de contacto', 'contacto@institucion.bo'],
  ['sitio_web', 'Sitio web', 'https://institucion.bo'],
  ['url_logo', 'URL pública del logotipo', 'URL HTTPS de PNG/JPG/SVG'],
];

export default function ConfiguracionInstitucionPage() {
  const { cargarConfiguracion, guardarConfiguracion, cargandoConfiguracion, errorConfiguracion } = useConfiguracionInstitucion();
  const [form, setForm] = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [cargandoFormulario, setCargandoFormulario] = useState(true);
  const [aviso, setAviso] = useState(null);

  const cargarFormularioAdministrativo = useCallback(async () => {
    setCargandoFormulario(true);
    try {
      const response = await api.get('/configuracion-institucion/admin');
      const data = response.data?.configuracion || response.data || {};
      setForm({ ...EMPTY, ...data });
    } catch (error) {
      setAviso({ tipo: 'error', mensaje: error.response?.data?.error || 'No se pudieron cargar los datos administrativos. Inicie sesión con un usuario ADMIN.' });
    } finally {
      setCargandoFormulario(false);
    }
  }, []);

  useEffect(() => {
    cargarFormularioAdministrativo();
  }, [cargarFormularioAdministrativo]);

  const cambiar = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setAviso(null);
    if (!form.razon_social.trim() || !form.nit.trim()) {
      setAviso({ tipo: 'error', mensaje: 'La razón social y el NIT son obligatorios.' });
      return;
    }
    for (const key of ['color_primario', 'color_secundario', 'color_acento']) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(form[key])) {
        setAviso({ tipo: 'error', mensaje: `El campo ${key} debe contener un color hexadecimal válido.` });
        return;
      }
    }
    setGuardando(true);
    try {
      await guardarConfiguracion({
        ...form,
        razon_social: form.razon_social.trim(),
        nit: form.nit.trim(),
        tasa_interes_penal_diaria: Number(form.tasa_interes_penal_diaria),
      });
      setAviso({ tipo: 'ok', mensaje: 'Configuración guardada. La identidad visual se actualizó en el dashboard.' });
    } catch (error) {
      setAviso({ tipo: 'error', mensaje: error.response?.data?.error || 'No se pudo guardar la configuración.' });
    } finally {
      setGuardando(false);
    }
  };

  const textField = (name, label, placeholder = '') => (
    <label key={name} className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input name={name} value={form[name] ?? ''} onChange={cambiar} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" />
    </label>
  );

  if (cargandoFormulario) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Cargando configuración institucional...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-slate-800">
      <header className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-100 p-2.5"><Building2 className="h-6 w-6 text-slate-700" /></div>
          <div>
            <h1 className="text-xl font-bold">Configuración institucional</h1>
            <p className="mt-1 text-sm text-slate-500">Identidad visual, membrete documental y comparecientes.</p>
          </div>
        </div>
        <button type="button" onClick={async () => { await cargarConfiguracion(); await cargarFormularioAdministrativo(); }} disabled={cargandoConfiguracion || cargandoFormulario}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${cargandoConfiguracion ? 'animate-spin' : ''}`} /> Recargar
        </button>
      </header>

      {errorConfiguracion && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{errorConfiguracion}</div>}
      {aviso && <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${aviso.tipo === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
        {aviso.tipo === 'ok' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}{aviso.mensaje}
      </div>}

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><Building2 className="h-5 w-5" /> Datos institucionales y contacto</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS_TEXT.map(([name, label, placeholder]) => textField(name, label, placeholder))}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Moneda base</span>
              <select name="moneda_base" value={form.moneda_base || 'BOB'} onChange={cambiar} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="BOB">BOB — Bolivianos</option><option value="USD">USD — Dólares estadounidenses</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tasa penal diaria (factor decimal)</span>
              <input type="number" step="0.0001" min="0" max="9.9999" name="tasa_interes_penal_diaria" value={form.tasa_interes_penal_diaria ?? '0.0010'} onChange={cambiar} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" />
            </label>
          </div>
          {form.url_logo && <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-16 w-24 items-center justify-center rounded bg-white p-2"><img src={form.url_logo} alt="Vista previa del logotipo institucional" className="max-h-full max-w-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>
            <div className="text-sm text-slate-600"><ImageIcon className="mr-1 inline h-4 w-4" /> Vista previa del logotipo. Use una URL HTTPS accesible para el navegador.</div>
          </div>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><Palette className="h-5 w-5" /> Colores institucionales</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['color_primario', 'Color primario', 'Barra principal y encabezados'],
              ['color_secundario', 'Color secundario', 'Navegación y tablas'],
              ['color_acento', 'Color de acento', 'Botones principales, indicadores y detalles'],
            ].map(([name, label, description]) => <div key={name} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-3">
                <input aria-label={label} type="color" name={name} value={form[name] || '#0F172A'} onChange={cambiar} className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0" />
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="text-xs text-slate-500">{description}</p></div>
              </div>
              <input name={name} value={form[name] || ''} onChange={cambiar} maxLength={7} className="mt-3 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-sm uppercase" />
            </div>)}
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="p-3 text-white" style={{ backgroundColor: form.color_primario }}>
              <div className="flex items-center gap-3">{form.url_logo && <img src={form.url_logo} alt="" className="h-8 w-8 rounded bg-white object-contain p-1" />}<div><p className="font-bold">{form.razon_social || 'Nombre de la institución'}</p><p className="text-xs opacity-80">Vista previa del dashboard</p></div></div>
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="text-sm text-slate-600">Elemento de navegación</span>
              <span className="rounded-md px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: form.color_secundario }}>Sección activa</span>
              <button type="button" className="rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-sm" style={{ backgroundColor: form.color_acento }}>Botón principal</button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-5 w-5" /> Datos del representante y comparecientes</h2>
          <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> Estos datos se incorporarán al contrato preliminar. Verifique la identidad del representante, su nombramiento o poder, las facultades y el domicilio legal antes de permitir la firma. Completar estos campos no constituye verificación jurídica automática.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {textField('domicilio_legal', 'Domicilio legal de la entidad', 'Domicilio que constará en el contrato')}
            {textField('representante_legal', 'Nombre completo del representante legal', 'Nombre según documento')}
            {textField('documento_representante', 'Documento de identidad del representante', 'CI / documento')}
            {textField('cargo_representante', 'Cargo o calidad en la que comparece', 'Representante legal, apoderado, etc.')}
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Referencia de poder, nombramiento o facultades</span>
              <textarea name="referencia_facultades" rows="3" value={form.referencia_facultades || ''} onChange={cambiar} placeholder="Identificación del instrumento y alcance de las facultades; no incluir un dato que no haya sido verificado." className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={guardando} className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-60" style={{ backgroundColor: form.color_acento || '#0EA5E9' }}>
            {guardando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {guardando ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
