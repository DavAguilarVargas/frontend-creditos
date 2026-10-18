import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/axios';
import { fechaActualISOBolivia, formatoFechaBolivia } from '../utils/fechaBolivia';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

const money = (value, currency = 'BOB') => {
  const number = Number(value ?? 0);
  try {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: currency || 'BOB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(number) ? number : 0);
  } catch {
    return `Bs. ${(Number.isFinite(number) ? number : 0).toFixed(2)}`;
  }
};

const localDateISO = () => fechaActualISOBolivia();

const dateLabel = (value) => {
  if (!value) return 'Pendiente';
  return formatoFechaBolivia(value, 'Pendiente');
};

function normalizarTipoCredito(value) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return 'No especificado';

  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const compact = normalized.replace(/[^a-z]/g, '');
  const productos = [
    ['capital de operaciones', 'Mi negocio - Capital de Operaciones'],
    ['capital de inversion', 'Mi negocio - Capital de Inversión'],
    ['productivo', 'Mi negocio - Productivo'],
    ['efectivo', 'Personal - Efectivo'],
    ['vehicular', 'Personal - Vehicular'],
    ['vivienda normal', 'Vivienda - Vivienda Normal'],
    ['vivienda social', 'Vivienda - Vivienda Social'],
  ];
  const producto = productos.find(([clave]) => normalized.includes(clave));
  if (producto) return producto[1];

  // Evita imprimir la concatenación de todas las categorías como si fuera un producto válido.
  if (/minegocio.*personal.*vivien/.test(compact)) {
    return 'No especificado - revisar destino registrado en la solicitud';
  }
  if (normalized === 'mi negocio' || normalized === 'personal' || normalized === 'vivienda') {
    return `${raw} - producto no especificado`;
  }
  return raw;
}

const normalizarExpediente = (data) => {
  if (!data?.credito || !Array.isArray(data.cuotas)) return null;
  return {
    ...data,
    garantias: Array.isArray(data.garantias) ? data.garantias : [],
    institucion: data.institucion || null,
  };
};

function colorHexRGB(value, fallback = [15, 23, 42]) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(value || ''));
  if (!match) return fallback;
  const hex = match[1];
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

async function cargarLogoComoPng(url) {
  if (!url || typeof window === 'undefined') return null;
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const imageReady = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('No se pudo cargar el logotipo.'));
    });
    image.src = url;
    await imageReady;
    if (!image.naturalWidth || !image.naturalHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    // La falta de permisos CORS para el logo no debe impedir emitir el borrador PDF.
    console.warn('No se pudo incorporar el logotipo al PDF; se usará el membrete textual.', error);
    return null;
  }
}

function dibujarEncabezado(doc, institucion, subtitulo, branding, fechaAprobacion) {
  const razon = institucion?.razon_social || 'ENTIDAD FINANCIERA';
  const nit = institucion?.nit ? `NIT: ${institucion.nit}` : 'NIT: [POR CONFIGURAR]';
  const primary = branding?.primary || [15, 23, 42];
  const secondary = branding?.secondary || [3, 105, 161];
  const accent = branding?.accent || [14, 165, 233];

  // Membrete institucional repetido en cada página: barra, línea y acento.
  doc.setFillColor(...primary);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFillColor(...secondary);
  doc.rect(0, 29, 210, 1.2, 'F');
  doc.setFillColor(...accent);
  doc.rect(207, 0, 3, 30, 'F');

  // Logotipo alineado a la esquina superior derecha sobre el membrete institucional.
  const logo = branding?.logo;
  if (logo?.dataUrl && logo.width > 0 && logo.height > 0) {
    try {
      const box = { x: 181, y: 3.5, w: 22, h: 19.5 };
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(box.x, box.y, box.w, box.h, 1.4, 1.4, 'F');
      const ratio = Math.min((box.w - 2) / logo.width, (box.h - 2) / logo.height);
      const logoW = logo.width * ratio;
      const logoH = logo.height * ratio;
      const logoX = box.x + (box.w - logoW) / 2;
      const logoY = box.y + (box.h - logoH) / 2;
      doc.addImage(logo.dataUrl, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
    } catch (error) {
      console.warn('No fue posible dibujar el logotipo en el PDF.', error);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(String(razon).slice(0, 80), 14, 10, { maxWidth: 160 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(String(nit).slice(0, 100), 14, 16, { maxWidth: 160 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text(String(subtitulo).toUpperCase().slice(0, 115), 14, 25, { maxWidth: 126 });
  doc.setFontSize(6.7);
  const fecha = fechaAprobacion ? dateLabel(fechaAprobacion) : 'NO REGISTRADA';
  doc.text(`APROBACIÓN: ${fecha}`, 196, 25, { align: 'right', maxWidth: 60 });
  doc.setTextColor(31, 41, 55);
}

function dibujarPie(doc, institucion, branding) {
  const total = doc.getNumberOfPages();
  const secondary = branding?.secondary || [3, 105, 161];
  const contacto = [
    institucion?.direccion ? `Dirección: ${institucion.direccion}` : '',
    institucion?.telefono ? `Tel.: ${institucion.telefono}` : '',
    institucion?.correo_contacto ? `Correo: ${institucion.correo_contacto}` : '',
    institucion?.sitio_web ? `Web: ${institucion.sitio_web}` : '',
  ].filter(Boolean).join('  |  ');

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...secondary);
    doc.setLineWidth(0.35);
    doc.line(14, 279, 196, 279);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(71, 85, 105);
    const footerContact = contacto || 'Datos de contacto institucional pendientes de configuración.';
    doc.text(footerContact.slice(0, 150), 14, 283.5, { maxWidth: 182 });
    doc.setFontSize(6.8);
    doc.setTextColor(127, 29, 29);
    doc.text('BORRADOR - PENDIENTE DE FIRMA / VALIDACIÓN DOCUMENTAL', 14, 290);
    doc.setTextColor(71, 85, 105);
    doc.text(`Página ${page} de ${total}`, 196, 290, { align: 'right' });
  }
}

async function generarPdfExpediente(expediente) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { credito, contrato, cuotas, garantias, institucion } = expediente;
  const branding = {
    primary: colorHexRGB(institucion?.color_primario, [15, 23, 42]),
    secondary: colorHexRGB(institucion?.color_secundario, [3, 105, 161]),
    accent: colorHexRGB(institucion?.color_acento, [14, 165, 233]),
    logo: await cargarLogoComoPng(institucion?.url_logo),
  };
  const titular = `${credito.nombres || ''} ${credito.apellidos || ''}`.trim() || 'Titular no disponible';
  const moneda = institucion?.moneda_base || 'BOB';
  const fechaAprobacion = credito.fecha_aprobacion || null;
  const fechaAprobacionLabel = fechaAprobacion ? dateLabel(fechaAprobacion) : 'No registrada en auditoría';
  const tipoCreditoLabel = normalizarTipoCredito(credito.destino_credito);
  const monto = Number(credito.monto_aprobado || 0);
  const totalCapital = cuotas.reduce((sum, cuota) => sum + Number(cuota.capital || 0), 0);
  const totalInteres = cuotas.reduce((sum, cuota) => sum + Number(cuota.interes || 0), 0);
  const totalPagos = cuotas.reduce((sum, cuota) => sum + Number(cuota.monto || 0), 0);
  const primeraCuota = cuotas[0];
  const ultimaCuota = cuotas[cuotas.length - 1];
  const garantiaResumen = garantias.length
    ? garantias.map((g) => `${g.tipo_garantia}: ${g.descripcion} (avaluo ${money(g.valor_avaluo, moneda)})`)
    : [`Tipo propuesto: ${credito.tipo_garantia_propuesta || 'No especificado'}. No hay garantías detalladas registradas.`];

  // SECCION 1: ACUERDO DE CONDICIONES DE CREDITO. Es un borrador, no acredita desembolso.
  dibujarEncabezado(doc, institucion, 'Acuerdo de condiciones de credito', branding, fechaAprobacion);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ACUERDO DE CONDICIONES DE CREDITO', 14, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(153, 27, 27);
  doc.text('DOCUMENTO PRELIMINAR - PENDIENTE DE FIRMA', 14, 45);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Credito: ${credito.numero_credito || '-'}`, 14, 53);
  doc.text(`Contrato: ${contrato?.numero_contrato || '-'}`, 112, 53);
  doc.text(`Solicitud: ${credito.id_solicitud}`, 14, 59);
  doc.text(`Estado documental: ${contrato?.estado || 'PENDIENTE_FIRMA'}`, 112, 59);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('1. DATOS DEL TITULAR', 14, 68);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Nombre completo: ${titular}`, 14, 75);
  doc.text(`Documento de identidad: ${credito.ci || '-'}`, 14, 81);
  doc.text(`Direccion: ${credito.direccion_domicilio || '-'}`, 14, 87, { maxWidth: 180 });
  doc.text(`Telefono: ${credito.telefono_contacto || '-'}   Correo: ${credito.correo || '-'}`, 14, 94, { maxWidth: 180 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('2. CONDICIONES FINANCIERAS', 14, 103);
  autoTable(doc, {
    startY: 107,
    head: [['Concepto', 'Condicion aprobada']],
    body: [
      ['Fecha de aprobación', fechaAprobacionLabel],
      ['Tipo de crédito / producto', tipoCreditoLabel],
      ['Monto aprobado', money(monto, moneda)],
      ['Tasa anual', `${Number(credito.tasa_interes || 0).toFixed(3)}% nominal anual (criterio de calculo mensual: tasa anual / 12)`],
      ['Plazo', `${credito.plazo_meses} meses / ${cuotas.length} cuotas`],
      ['Sistema de amortizacion', 'Frances - cuota periodica calculada, con ajuste en la ultima cuota'],
      ['Importe de primera cuota', primeraCuota ? money(primeraCuota.monto, moneda) : 'No generado'],
      ['Primer vencimiento', primeraCuota ? dateLabel(primeraCuota.fecha_vencimiento) : 'No generado'],
      ['Total proyectado de intereses', money(totalInteres, moneda)],
      ['Total proyectado de pagos', money(totalPagos, moneda)],
    ],
    theme: 'grid',
    headStyles: { fillColor: branding.primary, fontSize: 8 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.1, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 54, fontStyle: 'bold' }, 1: { cellWidth: 128 } },
    margin: { top: 34, left: 14, right: 14, bottom: 18 },
    didDrawPage: () => dibujarEncabezado(doc, institucion, 'Acuerdo de condiciones de credito', branding, fechaAprobacion),
  });

  let y = (doc.lastAutoTable?.finalY || 192) + 6;
  if (y > 244) {
    doc.addPage();
    dibujarEncabezado(doc, institucion, 'Acuerdo de condiciones de credito - continuacion', branding, fechaAprobacion);
    y = 40;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('3. GARANTIAS REGISTRADAS / PROPUESTAS', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  garantiaResumen.forEach((detalle) => {
    const lines = doc.splitTextToSize(`- ${detalle}`, 180);
    if (y + (lines.length * 4) > 265) {
      doc.addPage();
      dibujarEncabezado(doc, institucion, 'Acuerdo de condiciones de credito - continuacion', branding, fechaAprobacion);
      y = 40;
    }
    doc.text(lines, 14, y);
    y += (lines.length * 4) + 1.5;
  });
  y += 4;
  if (y > 252) {
    doc.addPage();
    dibujarEncabezado(doc, institucion, 'Acuerdo de condiciones de credito - firmas', branding, fechaAprobacion);
    y = 50;
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Este acuerdo resume condiciones registradas en el sistema. No constituye comprobante de desembolso ni evidencia por si mismo de firma o aceptacion.', 14, y, { maxWidth: 180 });
  y += 18;
  doc.setDrawColor(100, 116, 139);
  doc.line(18, y + 8, 88, y + 8);
  doc.line(122, y + 8, 192, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Firma del cliente', 53, y + 13, { align: 'center' });
  doc.text(`Nombre: ${titular}`.slice(0, 65), 18, y + 18);
  doc.text(`C.I.: ${credito.ci || '____________'}`, 18, y + 23);
  doc.text('Representante autorizado', 157, y + 13, { align: 'center' });
  doc.text('Nombre / cargo: __________________', 122, y + 18);
  doc.text('Fecha: __________________________', 122, y + 23);

  // SECCION 2: TABLA DE AMORTIZACION. La tabla puede continuar en varias hojas.
  doc.addPage();
  dibujarEncabezado(doc, institucion, 'Anexo de amortizacion', branding, fechaAprobacion);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TABLA DE AMORTIZACION', 14, 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Crédito: ${credito.numero_credito || '-'}   |   Titular: ${titular}`, 14, 45, { maxWidth: 180 });
  doc.text(`Fecha de aprobación: ${fechaAprobacionLabel}`, 14, 51, { maxWidth: 180 });
  doc.text(`Tipo de crédito / producto: ${tipoCreditoLabel}`, 14, 57, { maxWidth: 180 });
  doc.text(`Monto: ${money(monto, moneda)}   |   Tasa anual: ${Number(credito.tasa_interes || 0).toFixed(3)}%   |   Plazo: ${credito.plazo_meses} meses`, 14, 63, { maxWidth: 180 });

  autoTable(doc, {
    startY: 69,
    head: [['Nro.', 'Vencimiento', 'Saldo Capital', 'Capital', 'Interés', 'Cuota']],
    body: cuotas.map((cuota) => [
      String(cuota.numero),
      dateLabel(cuota.fecha_vencimiento),
      money(cuota.saldo, moneda),
      money(cuota.capital, moneda),
      money(cuota.interes, moneda),
      money(cuota.monto, moneda),
    ]),
    foot: [[
      'TOTALES',
      '',
      ultimaCuota ? money(ultimaCuota.saldo, moneda) : money(0, moneda),
      money(totalCapital, moneda),
      money(totalInteres, moneda),
      money(totalPagos, moneda),
    ]],
    showFoot: 'lastPage',
    theme: 'grid',
    headStyles: { fillColor: branding.primary, fontSize: 7.5 },
    footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7 },
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.7, overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 25 } },
    margin: { top: 34, left: 10, right: 10, bottom: 18 },
    didDrawPage: () => dibujarEncabezado(doc, institucion, 'Anexo de amortizacion', branding, fechaAprobacion),
  });

  // SECCION 3: CONTRATO PRIVADO - plantilla de borrador para validacion juridica.
  doc.addPage();
  dibujarEncabezado(doc, institucion, 'Contrato privado de credito - borrador', branding, fechaAprobacion);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CONTRATO PRIVADO DE CREDITO', 14, 39);
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(8);
  doc.text('BORRADOR PARA REVISION JURIDICA - NO FIRMADO', 14, 45);
  doc.setTextColor(31, 41, 55);

  const nombreInstitucion = institucion?.razon_social || '[RAZON SOCIAL DE LA INSTITUCION]';
  const nitInstitucion = institucion?.nit || '[NIT]';
  const fechaFirma = contrato?.fecha_firma ? dateLabel(contrato.fecha_firma) : 'Pendiente de firma';
  const clausulas = [
    ['COMPARECIENTES', `Por una parte, ${nombreInstitucion}, con NIT ${nitInstitucion}, domicilio legal ${institucion?.domicilio_legal || institucion?.direccion || '[DOMICILIO LEGAL POR COMPLETAR Y VERIFICAR]'}, representada por ${institucion?.representante_legal || '[NOMBRE DEL REPRESENTANTE LEGAL POR COMPLETAR]'}, documento ${institucion?.documento_representante || '[DOCUMENTO POR COMPLETAR]'}, en calidad de ${institucion?.cargo_representante || '[CARGO / CALIDAD POR COMPLETAR]'}, cuyas facultades se respaldan en ${institucion?.referencia_facultades || '[PODER, NOMBRAMIENTO O FACULTADES POR IDENTIFICAR Y VERIFICAR]'}, en adelante LA ENTIDAD; y por otra, ${titular}, con documento de identidad ${credito.ci || '[CI DEL PRESTATARIO POR COMPLETAR]'}, domicilio ${credito.direccion_domicilio || '[DOMICILIO DEL PRESTATARIO POR COMPLETAR Y VERIFICAR]'}, en adelante EL PRESTATARIO. La identidad, representación, domicilios y facultades deberán completarse y verificarse documentalmente antes de la firma.`],
    ['PRIMERA. OBJETO', `LA ENTIDAD y EL PRESTATARIO acuerdan documentar las condiciones del credito identificado como ${credito.numero_credito || '-'} y contrato ${contrato?.numero_contrato || '-'}. La fecha de aprobación registrada es ${fechaAprobacionLabel}. Este texto es preliminar y requiere revision y aprobacion juridica antes de su utilizacion contractual.`],
    ['SEGUNDA. MONTO Y DESTINO', `El monto aprobado registrado es ${money(monto, moneda)} y el destino declarado es: ${credito.destino_credito || 'no especificado'}. El registro de aprobacion no acredita la entrega de los fondos. El desembolso se documentara de forma separada cuando se confirme la operacion correspondiente.`],
    ['TERCERA. PLAZO Y AMORTIZACION', `El plazo previsto es de ${credito.plazo_meses} meses. El sistema de amortizacion registrado es frances, con una tasa anual de ${Number(credito.tasa_interes || 0).toFixed(3)}% interpretada como nominal anual dividida entre doce para el calculo mensual. El anexo de amortizacion forma parte del expediente preliminar. Las convenciones financieras definitivas deben constar expresamente en la version aprobada para firma.`],
    ['CUARTA. PAGOS', `EL PRESTATARIO debera efectuar los pagos conforme a las fechas, importes y canales que se establezcan en el contrato definitivo y su cronograma validado. Cualquier comision, seguro, gasto o descuento debera identificarse de forma expresa, con su base y autorizacion correspondiente; este borrador no incorpora conceptos no presentes en los datos aprobados.`],
    ['QUINTA. GARANTIAS', garantiaResumen.join(' | ') + '. La existencia, titularidad, valor, formalidades, perfeccionamiento y eventual ejecucion de cada garantia deben verificarse documentalmente y describirse conforme a la naturaleza del bien o respaldo ofrecido.'],
    ['SEXTA. INCUMPLIMIENTO Y MORA', 'Las consecuencias del incumplimiento, el calculo de intereses moratorios, las notificaciones y los mecanismos de cobro deben definirse en la version contractual aprobada, respetando la normativa aplicable y las condiciones informadas al consumidor financiero. No se establecen aqui condiciones adicionales no validadas.'],
    ['SEPTIMA. DECLARACIONES Y DOCUMENTOS', 'Las partes deberan verificar la identidad, capacidad, documentacion de respaldo y exactitud de la informacion del expediente antes de suscribir el documento definitivo. Toda modificacion posterior debera autorizarse y documentarse mediante el procedimiento que corresponda.'],
    ['OCTAVA. FIRMA Y VIGENCIA', `Este documento se genera como borrador del sistema el ${dateLabel(new Date())}. Estado actual del contrato en base de datos: ${contrato?.estado || 'PENDIENTE_FIRMA'}. Fecha de firma registrada: ${fechaFirma}. La vigencia contractual no se presume a partir de la generacion de este PDF.`],
  ];

  let cursorY = 53;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  clausulas.forEach(([titulo, texto]) => {
    const tituloLineas = doc.splitTextToSize(titulo, 180);
    const textoLineas = doc.splitTextToSize(texto, 180);
    const alturaNecesaria = (tituloLineas.length * 4) + (textoLineas.length * 3.7) + 4;
    if (cursorY + alturaNecesaria > 267) {
      doc.addPage();
      dibujarEncabezado(doc, institucion, 'Contrato privado de credito - continuacion', branding, fechaAprobacion);
      cursorY = 39;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.text(tituloLineas, 14, cursorY);
    cursorY += (tituloLineas.length * 4) + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.text(textoLineas, 14, cursorY, { lineHeightFactor: 1.15 });
    cursorY += (textoLineas.length * 3.7) + 4;
  });

  if (cursorY + 30 > 270) {
    doc.addPage();
    dibujarEncabezado(doc, institucion, 'Contrato privado de credito - firmas', branding, fechaAprobacion);
    cursorY = 60;
  }
  cursorY += 4;
  doc.setDrawColor(100, 116, 139);
  doc.line(18, cursorY + 8, 88, cursorY + 8);
  doc.line(122, cursorY + 8, 192, cursorY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('EL PRESTATARIO', 53, cursorY + 13, { align: 'center' });
  doc.text(`Nombre: ${titular}`.slice(0, 65), 18, cursorY + 18);
  doc.text(`C.I.: ${credito.ci || '____________'}`, 18, cursorY + 23);
  doc.text('LA ENTIDAD / REPRESENTANTE', 157, cursorY + 13, { align: 'center' });
  doc.text('Nombre y cargo: __________________', 122, cursorY + 18);
  doc.text('Fecha: __________________________', 122, cursorY + 23);

  dibujarPie(doc, institucion, branding);
  const nombreArchivo = `expediente-${credito.numero_credito || credito.id_credito}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-');
  doc.save(nombreArchivo);
}

export default function AprobacionesPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState('PENDIENTES');
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [modal, setModal] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [fechaBase, setFechaBase] = useState(localDateISO());
  const [guardando, setGuardando] = useState(false);
  const [notificacion, setNotificacion] = useState(null);
  const [expediente, setExpediente] = useState(null);
  const [cargandoExpediente, setCargandoExpediente] = useState(false);
  const [pdfGenerando, setPdfGenerando] = useState(false);

  const mostrarNotificacion = useCallback((tipo, titulo, mensaje) => {
    setNotificacion({ tipo, titulo, mensaje });
  }, []);

  const cargarSolicitudes = useCallback(async (mostrarCarga = true) => {
    if (mostrarCarga) setCargando(true);
    setErrorCarga('');
    try {
      const respuesta = await api.get('/solicitudes');
      setSolicitudes(Array.isArray(respuesta.data) ? respuesta.data : []);
    } catch (error) {
      const mensaje = error.response?.data?.error || 'No fue posible consultar las solicitudes.';
      setErrorCarga(mensaje);
      mostrarNotificacion('error', 'Error de conexión', mensaje);
    } finally {
      setCargando(false);
    }
  }, [mostrarNotificacion]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const pendientes = useMemo(
    () => solicitudes.filter((s) => s.estado === 'EN_EVALUACION'),
    [solicitudes]
  );
  const historial = useMemo(
    () => solicitudes.filter((s) => ['APROBADA', 'RECHAZADA'].includes(s.estado)),
    [solicitudes]
  );
  const listaActual = vista === 'PENDIENTES' ? pendientes : historial;
  const listaFiltrada = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return listaActual;
    return listaActual.filter((s) => [
      s.id_solicitud,
      s.cliente,
      s.nombres,
      s.apellidos,
      s.ci,
      s.numero_credito,
      s.numero_contrato,
    ].some((value) => String(value ?? '').toLowerCase().includes(termino)));
  }, [listaActual, busqueda]);

  const abrirAprobacion = (solicitud) => {
    if (solicitud.evaluacion_dictamen !== 'FAVORABLE') {
      mostrarNotificacion('error', 'Regla RN03', 'Solo se pueden aprobar solicitudes con evaluación FAVORABLE.');
      return;
    }
    setSolicitudSeleccionada(solicitud);
    setFechaBase(localDateISO());
    setModal('APROBAR');
  };

  const abrirRechazo = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setMotivo('');
    setModal('RECHAZAR');
  };

  const ejecutarDecision = async (event) => {
    event?.preventDefault?.();
    if (!solicitudSeleccionada || guardando) return;
    if (modal === 'RECHAZAR' && !motivo.trim()) {
      mostrarNotificacion('error', 'Falta el motivo', 'El rechazo requiere un motivo registrado.');
      return;
    }
    if (modal === 'APROBAR' && !fechaBase) {
      mostrarNotificacion('error', 'Falta la fecha base', 'Selecciona la fecha prevista para el inicio del cronograma.');
      return;
    }

    const decision = modal;
    setGuardando(true);
    try {
      const payload = {
        id_solicitud: Number(solicitudSeleccionada.id_solicitud),
        decision: decision === 'APROBAR' ? 'APROBAR' : 'RECHAZAR',
      };
      if (decision === 'RECHAZAR') payload.motivo = motivo.trim();
      if (decision === 'APROBAR') payload.fecha_base_cronograma = fechaBase;

      const respuesta = await api.post('/creditos/evaluar', payload);
      if (decision === 'APROBAR') {
        const expedienteNuevo = normalizarExpediente(respuesta.data);
        if (!expedienteNuevo) {
          throw new Error('El backend respondió sin el expediente completo del crédito. Revisa la respuesta de /api/creditos/evaluar.');
        }
        setExpediente(expedienteNuevo);
        mostrarNotificacion(
          'success',
          'CU07, CU09 y CU10 completados',
          `Se aprobó ${expedienteNuevo.credito.numero_credito}, se generó ${expedienteNuevo.contrato.numero_contrato} pendiente de firma y se registraron ${expedienteNuevo.cuotas.length} cuotas.`
        );
      } else {
        setExpediente(null);
        mostrarNotificacion('success', 'Solicitud rechazada', 'La decisión y el motivo quedaron registrados en auditoría.');
      }
      setModal(null);
      setSolicitudSeleccionada(null);
      setMotivo('');
      await cargarSolicitudes(false);
    } catch (error) {
      const mensaje = error.response?.data?.error || error.message || 'No fue posible procesar la decisión.';
      mostrarNotificacion('error', 'Operación no completada', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const verExpediente = async (solicitud) => {
    if (!solicitud?.id_credito) {
      mostrarNotificacion('warning', 'Expediente no disponible', 'Esta solicitud no tiene crédito asociado en la base de datos.');
      return;
    }
    setCargandoExpediente(true);
    try {
      const respuesta = await api.get(`/creditos/${solicitud.id_credito}`);
      const data = normalizarExpediente(respuesta.data);
      if (!data) throw new Error('El backend no devolvió un expediente con crédito y cuotas.');
      setExpediente(data);
    } catch (error) {
      mostrarNotificacion('error', 'No se pudo consultar el expediente', error.response?.data?.error || error.message || 'Error de consulta.');
    } finally {
      setCargandoExpediente(false);
    }
  };

  const descargarPdf = async () => {
    if (!expediente) return;
    try {
      setPdfGenerando(true);
      await generarPdfExpediente(expediente);
      mostrarNotificacion('success', 'PDF generado', 'Se descargó un expediente preliminar con condiciones, amortización y contrato privado en borrador.');
    } catch (error) {
      console.error('Error al generar PDF del expediente:', error);
      mostrarNotificacion('error', 'No se pudo generar el PDF', 'Revise que el crédito tenga contrato y cronograma registrados.');
    } finally {
      setPdfGenerando(false);
    }
  };

  const estadoBadge = (estado) => {
    const clases = estado === 'APROBADA'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : estado === 'RECHAZADA'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-sky-50 text-sky-700 border-sky-200';
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${clases}`}>{estado}</span>;
  };

  const moneda = expediente?.institucion?.moneda_base || 'BOB';

  return (
    <div className="space-y-6 text-slate-800">
      {notificacion && (
        <div className={`fixed top-4 right-4 z-50 max-w-md rounded-xl border bg-white p-4 shadow-xl ${notificacion.tipo === 'success' ? 'border-emerald-300' : notificacion.tipo === 'warning' ? 'border-amber-300' : 'border-rose-300'}`} role="status">
          <div className="flex items-start gap-3">
            {notificacion.tipo === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{notificacion.titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{notificacion.mensaje}</p>
            </div>
            <button type="button" onClick={() => setNotificacion(null)} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar aviso">×</button>
          </div>
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-slate-800" />
            <h1 className="text-xl font-bold">Bandeja de aprobación de créditos</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">CU07, CU08, CU09 y CU10 · Los datos se consultan desde PostgreSQL.</p>
        </div>
        <button type="button" onClick={() => cargarSolicitudes()} disabled={cargando} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
        </button>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">Pendientes de decisión</p><p className="mt-2 text-2xl font-bold">{pendientes.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">Aprobadas</p><p className="mt-2 text-2xl font-bold text-emerald-700">{solicitudes.filter((s) => s.estado === 'APROBADA').length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">Rechazadas</p><p className="mt-2 text-2xl font-bold text-rose-700">{solicitudes.filter((s) => s.estado === 'RECHAZADA').length}</p></div>
      </section>

      {errorCarga && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="h-5 w-5 shrink-0" /><div className="flex-1">{errorCarga}</div>
          <button type="button" onClick={() => cargarSolicitudes()} className="font-semibold underline">Reintentar</button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={() => setVista('PENDIENTES')} className={`rounded-md px-3 py-2 text-xs font-bold ${vista === 'PENDIENTES' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}>Pendientes ({pendientes.length})</button>
            <button type="button" onClick={() => setVista('HISTORIAL')} className={`rounded-md px-3 py-2 text-xs font-bold ${vista === 'HISTORIAL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}>Historial ({historial.length})</button>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:w-80">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} className="w-full text-sm outline-none" placeholder="Buscar por cliente, CI o solicitud" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-4">Solicitud / cliente</th><th className="p-4">Condiciones</th><th className="p-4">Evaluación</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Cargando solicitudes reales...</td></tr>
              ) : listaFiltrada.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-500"><Clock className="mx-auto mb-2 h-6 w-6 text-slate-400" />{vista === 'PENDIENTES' ? 'No hay solicitudes pendientes de decisión.' : 'No hay decisiones registradas que coincidan con la búsqueda.'}</td></tr>
              ) : listaFiltrada.map((s) => (
                <tr key={s.id_solicitud} className="align-top hover:bg-slate-50/70">
                  <td className="p-4">
                    <span className="mb-1 inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold">SOL-#{s.id_solicitud}</span>
                    <p className="font-semibold text-slate-900">{s.cliente || `${s.nombres || ''} ${s.apellidos || ''}`.trim() || 'Cliente'}</p>
                    <p className="mt-1 text-xs text-slate-500">CI: {s.ci || '—'}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Registrada: {dateLabel(s.fecha_solicitud_local ? String(s.fecha_solicitud_local).slice(0, 10) : s.fecha_solicitud)}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold">{money(s.monto_solicitado)}</p>
                    <p className="mt-1 text-xs text-slate-500">{s.plazo_meses} meses · {Number(s.tasa_interes_anual || 0).toFixed(3)}% anual</p>
                    <p className="mt-1 max-w-[220px] text-xs text-slate-500">{s.destino_credito || 'Destino no indicado'}</p>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-md border px-2 py-1 text-[11px] font-bold ${s.evaluacion_dictamen === 'FAVORABLE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : s.evaluacion_dictamen === 'DESFAVORABLE' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{s.evaluacion_dictamen || 'SIN EVALUACION'}</span>
                    <p className="mt-2 text-xs text-slate-500">Riesgo: {s.nivel_riesgo || '—'}</p>
                    <p className="mt-1 text-xs text-slate-500">Capacidad: {s.capacidad_pago !== null && s.capacidad_pago !== undefined ? money(s.capacidad_pago) : '—'}</p>
                  </td>
                  <td className="p-4">{estadoBadge(s.estado)}{s.numero_credito && <p className="mt-2 font-mono text-[11px] text-slate-500">{s.numero_credito}</p>}{s.numero_contrato && <p className="mt-1 text-[11px] text-slate-500">Contrato: {s.numero_contrato}</p>}{s.estado_contrato && <p className="mt-1 text-[11px] text-slate-500">Doc.: {s.estado_contrato}</p>}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {s.estado === 'EN_EVALUACION' ? (
                        <>
                          <button type="button" onClick={() => abrirAprobacion(s)} disabled={s.evaluacion_dictamen !== 'FAVORABLE'} title={s.evaluacion_dictamen !== 'FAVORABLE' ? 'La evaluación debe ser FAVORABLE' : 'Aprobar y formalizar'} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"><CheckCircle2 className="h-3.5 w-3.5" /> Aprobar</button>
                          <button type="button" onClick={() => abrirRechazo(s)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"><XCircle className="h-3.5 w-3.5" /> Rechazar</button>
                        </>
                      ) : s.estado === 'APROBADA' && s.id_credito ? (
                        <button type="button" onClick={() => verExpediente(s)} disabled={cargandoExpediente} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"><Eye className="h-3.5 w-3.5" /> Ver expediente</button>
                      ) : <span className="text-xs text-slate-400">Sin acciones</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {expediente && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-slate-700" /><h2 className="text-base font-bold">Expediente generado</h2></div>
              <p className="mt-1 text-sm text-slate-600">{expediente.credito.numero_credito} · {expediente.contrato?.numero_contrato || 'Contrato no disponible'} · {expediente.cuotas.length} cuotas registradas</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700">Crédito: {expediente.credito.estado_credito}</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-700">Contrato: {expediente.contrato?.estado || 'PENDIENTE_FIRMA'}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">Cronograma: {expediente.cuotas.length} pagos</span>
              </div>
              <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-500">El PDF descargable contiene el acuerdo de condiciones, la tabla de amortización y un contrato privado en borrador. No acredita firma ni desembolso. La plantilla contractual debe ser revisada por asesoría jurídica antes de su uso real.</p>
            </div>
            <button type="button" onClick={descargarPdf} disabled={pdfGenerando || !expediente.cuotas.length || !expediente.contrato?.numero_contrato} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><Download className="h-4 w-4" /> Descargar expediente PDF</button>
          </div>
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[650px] text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-left">N.º</th><th className="p-3 text-left">Vencimiento</th><th className="p-3 text-right">Capital</th><th className="p-3 text-right">Interés</th><th className="p-3 text-right">Cuota</th><th className="p-3 text-right">Saldo</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{expediente.cuotas.slice(0, 6).map((c) => <tr key={c.id_cuota || c.numero}><td className="p-3">{c.numero}</td><td className="p-3">{dateLabel(c.fecha_vencimiento)}</td><td className="p-3 text-right">{money(c.capital, moneda)}</td><td className="p-3 text-right">{money(c.interes, moneda)}</td><td className="p-3 text-right font-semibold">{money(c.monto, moneda)}</td><td className="p-3 text-right">{money(c.saldo, moneda)}</td></tr>)}</tbody>
            </table>
          </div>
          {expediente.cuotas.length > 6 && <p className="mt-2 text-xs text-slate-500">Mostrando las primeras 6 cuotas de {expediente.cuotas.length}. El PDF incluye el cronograma completo.</p>}
        </section>
      )}

      {modal && solicitudSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div><h2 className="text-lg font-bold">{modal === 'APROBAR' ? 'Confirmar aprobación y formalización' : 'Rechazar solicitud'}</h2><p className="mt-1 text-xs text-slate-500">Solicitud SOL-#{solicitudSeleccionada.id_solicitud} · {solicitudSeleccionada.cliente}</p></div>
              <button type="button" onClick={() => !guardando && setModal(null)} className="text-2xl leading-none text-slate-400 hover:text-slate-800" aria-label="Cerrar">×</button>
            </div>
            <form onSubmit={ejecutarDecision} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm">
                <div><p className="text-xs text-slate-500">Monto solicitado</p><p className="mt-1 font-bold">{money(solicitudSeleccionada.monto_solicitado)}</p></div>
                <div><p className="text-xs text-slate-500">Plazo</p><p className="mt-1 font-bold">{solicitudSeleccionada.plazo_meses} meses</p></div>
                <div><p className="text-xs text-slate-500">Dictamen</p><p className={`mt-1 font-bold ${solicitudSeleccionada.evaluacion_dictamen === 'FAVORABLE' ? 'text-emerald-700' : 'text-rose-700'}`}>{solicitudSeleccionada.evaluacion_dictamen}</p></div>
                <div><p className="text-xs text-slate-500">Nivel de riesgo</p><p className="mt-1 font-bold">{solicitudSeleccionada.nivel_riesgo || '—'}</p></div>
              </div>
              {modal === 'APROBAR' ? (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><strong>Se ejecutarán en una transacción:</strong> creación del crédito, contrato con estado PENDIENTE_FIRMA, generación de todas las cuotas y auditoría. No se registrará firma ni desembolso en este paso.</div>
                  <div><label htmlFor="fecha-base-cronograma" className="mb-1 block text-sm font-semibold">Fecha prevista/base del cronograma</label><input id="fecha-base-cronograma" type="date" min={localDateISO()} value={fechaBase} onChange={(event) => setFechaBase(event.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><p className="mt-1 text-xs text-slate-500">Los vencimientos mensuales se calcularán a partir de esta fecha. Debe coincidir con el plan previsto para la formalización.</p></div>
                </>
              ) : (
                <div><label htmlFor="motivo-rechazo" className="mb-1 block text-sm font-semibold">Motivo de rechazo (obligatorio)</label><textarea id="motivo-rechazo" rows="4" value={motivo} onChange={(event) => setMotivo(event.target.value)} required maxLength={500} placeholder="Describa la razón de la decisión..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><p className="mt-1 text-right text-xs text-slate-400">{motivo.length}/500</p></div>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setModal(null)} disabled={guardando} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={guardando} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${modal === 'APROBAR' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>{guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : modal === 'APROBAR' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{guardando ? 'Procesando...' : modal === 'APROBAR' ? 'Aprobar y generar' : 'Confirmar rechazo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
