import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatoFechaHoraBolivia, formatoFechaHoraLocalBolivia } from './fechaBolivia';

function hexToRgb(hex, fallback = [15, 23, 42]) {
  const text = String(hex || '').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(text)) return fallback;
  return [
    parseInt(text.slice(1, 3), 16),
    parseInt(text.slice(3, 5), 16),
    parseInt(text.slice(5, 7), 16),
  ];
}

async function cargarImagenComoDataUrl(url) {
  if (!url || typeof window === 'undefined') return null;
  try {
    // Igual que en el expediente de aprobación: cargar como imagen, pasar por canvas
    // y convertir a PNG para que jsPDF reciba un formato homogéneo.
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('No se pudo cargar el logotipo.'));
    });
    image.src = url;
    await loaded;
    if (!image.naturalWidth || !image.naturalHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    // La generación del PDF continúa con membrete textual si la URL del logo
    // no permite acceso CORS o la imagen no está disponible.
    console.warn('No se pudo incorporar el logotipo al comprobante; se usará el membrete textual.', error);
    return null;
  }
}

/**
 * Genera un solo PDF de dos páginas: copia para el cliente y copia para archivo bancario.
 * Es una constancia interna de una operación previamente registrada; no acredita por sí sola
 * una transferencia bancaria externa.
 */
export const generarBoletaPagoPDF = async (datosPago) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const institution = datosPago.institucion || {};
  const primary = hexToRgb(institution.color_primario, [15, 23, 42]);
  const accent = hexToRgb(institution.color_acento, [2, 132, 199]);
  const logoData = await cargarImagenComoDataUrl(institution.url_logo);
  const brandName = institution.razon_social || 'Sistema de Gestión de Créditos';
  const currency = institution.moneda_base || 'BOB';
  const money = (value) => Number(value || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const safeText = (value, max = 100) => String(value ?? '—').replace(/[\r\n]+/g, ' ').slice(0, max) || '—';
  const fecha = datosPago.fecha_pago_local
    ? formatoFechaHoraLocalBolivia(datosPago.fecha_pago_local)
    : datosPago.fecha_pago
      ? formatoFechaHoraBolivia(datosPago.fecha_pago)
      : formatoFechaHoraBolivia(new Date());
  const numeroRecibo = datosPago.numero_recibo || datosPago.nro_transaccion || '—';
  const numeroCredito = datosPago.numero_credito || (datosPago.id_credito ? `ID-${datosPago.id_credito}` : '—');
  const nroCuota = datosPago.nro_cuota ?? '—';
  const totalPago = datosPago.monto_total ?? datosPago.monto_pagado ?? 0;

  const drawHeader = (copyTitle) => {
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 31, 'F');
    doc.setFillColor(...accent);
    doc.rect(0, 31, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(brandName, logoData ? pageWidth - 62 : pageWidth - 28).slice(0, 2), 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const nitText = institution.nit ? `NIT: ${institution.nit}` : '';
    if (nitText) doc.text(nitText, 14, 25);

    if (logoData) {
      try {
        const box = { x: pageWidth - 36, y: 3.5, w: 23, h: 23 };
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(box.x, box.y, box.w, box.h, 1.4, 1.4, 'F');
        const ratio = Math.min((box.w - 2.4) / logoData.width, (box.h - 2.4) / logoData.height);
        const logoW = logoData.width * ratio;
        const logoH = logoData.height * ratio;
        const logoX = box.x + (box.w - logoW) / 2;
        const logoY = box.y + (box.h - logoH) / 2;
        doc.addImage(logoData.dataUrl, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
      } catch (error) {
        console.warn('No se pudo insertar el logo en el comprobante:', error);
      }
    }

    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('COMPROBANTE INTERNO DE PAGO', 14, 43);
    doc.setFillColor(...accent);
    doc.roundedRect(pageWidth - 61, 36, 47, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text(copyTitle, pageWidth - 37.5, 42.5, { align: 'center' });
  };

  const drawFooter = (pageNumber, totalPages) => {
    const contact = [institution.direccion, institution.telefono, institution.correo_contacto, institution.sitio_web]
      .filter(Boolean)
      .join(' · ');
    doc.setDrawColor(203, 213, 225);
    doc.line(14, pageHeight - 17, pageWidth - 14, pageHeight - 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const contactLines = contact ? doc.splitTextToSize(contact, pageWidth - 52).slice(0, 2) : [];
    if (contactLines.length) doc.text(contactLines, 14, pageHeight - (contactLines.length === 2 ? 11 : 9));
    doc.text(`${pageNumber}/${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  };

  const drawCopy = (copyTitle) => {
    drawHeader(copyTitle);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const left = 14;
    const right = pageWidth - 14;
    const mid = pageWidth / 2;
    const label = (text, value, x, y, width = 85) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text(text, x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      const valueLines = doc.splitTextToSize(safeText(value, 140), width).slice(0, 2);
      doc.text(valueLines, x, y + 4.5);
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primary);
    doc.text('DATOS DE LA OPERACIÓN', left, 54);
    doc.setDrawColor(...accent);
    doc.line(left, 57, right, 57);

    label('N.º DE RECIBO / TRANSACCIÓN', numeroRecibo, left, 64, 75);
    label('FECHA Y HORA', fecha, mid + 2, 64, 76);
    label('CRÉDITO', numeroCredito, left, 80, 75);
    label('CUOTA', `N.º ${nroCuota}`, mid + 2, 80, 76);
    label('CLIENTE', datosPago.nombre_cliente, left, 96, 83);
    label('CI DEL CLIENTE', datosPago.ci_cliente, mid + 2, 96, 76);
    label('CAJERO RESPONSABLE', datosPago.usuario_cajero || 'Cajero autorizado', left, 112, 83);
    label('MÉTODO DE PAGO', datosPago.metodo_pago, mid + 2, 112, 76);
    label('REFERENCIA EXTERNA', datosPago.referencia_externa || 'No aplica', left, 128, 83);
    label('ESTADO DEL CRÉDITO', datosPago.nuevo_estado_credito || '—', mid + 2, 128, 76);

    autoTable(doc, {
      startY: 145,
      margin: { top: 36, bottom: 23, left: 14, right: 14 },
      head: [['CONCEPTO', 'IMPORTE']],
      body: [
        ['Capital aplicado', `${currency} ${money(datosPago.monto_capital)}`],
        ['Interés corriente', `${currency} ${money(datosPago.monto_interes)}`],
        ['Penalidad registrada', `${currency} ${money(datosPago.monto_mora)}`],
        ['TOTAL PAGADO', `${currency} ${money(totalPago)}`],
        ['Saldo de capital posterior', `${currency} ${money(datosPago.saldo_restante)}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: accent, textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.7, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 112 }, 1: { halign: 'right' } },
      styles: { overflow: 'linebreak' },
      didDrawPage: () => drawHeader(copyTitle),
    });

    let finalY = doc.lastAutoTable?.finalY || 190;
    // El cuerpo del recibo es corto; si configuraciones futuras aumentan las filas,
    // mantener las firmas dentro de la página sin cortarlas.
    if (finalY + 42 > pageHeight - 22) {
      doc.addPage();
      drawHeader(copyTitle);
      finalY = 55;
    }
    const signatureY = finalY + 17;
    doc.setDrawColor(148, 163, 184);
    doc.line(18, signatureY, 88, signatureY);
    doc.line(pageWidth - 88, signatureY, pageWidth - 18, signatureY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Firma del cajero autorizado', 20, signatureY + 5);
    doc.text('Firma / conformidad del cliente', pageWidth - 86, signatureY + 5);

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const note = 'Constancia interna del registro del pago. Para QR o transferencia, la referencia fue declarada y verificada por un usuario autorizado; este documento no sustituye el comprobante emitido por la entidad financiera.';
    doc.text(doc.splitTextToSize(note, pageWidth - 28), 14, signatureY + 13);
  };

  drawCopy('COPIA CLIENTE');
  doc.addPage();
  drawCopy('COPIA BANCO');

  // Paginación y pie institucional sobre cada página (incluye páginas adicionales si se generan).
  const total = doc.internal.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    drawFooter(page, total);
  }

  const safeCredit = String(numeroCredito).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeReceipt = String(numeroRecibo).replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Comprobante_${safeCredit}_${safeReceipt}_2_copias.pdf`);
};
