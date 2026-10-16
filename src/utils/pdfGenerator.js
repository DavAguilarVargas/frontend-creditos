import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generarBoletaPagoPDF = (datosPago) => {
  const doc = new jsPDF();

  // Encabezado
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GESTIÓN DE CRÉDITOS - INF-241', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPROBANTE OFICIAL DE PAGO DE CUOTA', 14, 25);

  // Información del Pago
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nro. Comprobante: #PAG-${datosPago.id_pago || Date.now()}`, 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-BO')}`, 14, 49);
  doc.text(`Cliente: ${datosPago.nombre_cliente}`, 14, 56);
  doc.text(`C.I. / Documento: ${datosPago.ci_cliente}`, 14, 63);
  doc.text(`Nro. Crédito: #${datosPago.id_credito}`, 14, 70);

  // Tabla con Detalle de la Transacción
  doc.autoTable({
    startY: 78,
    head: [['Concepto', 'Detalle / Importe']],
    body: [
      ['Nro. de Cuota Cancelada', `Cuota N° ${datosPago.nro_cuota}`],
      ['Capital Pagado', `$${parseFloat(datosPago.monto_capital || 0).toFixed(2)}`],
      ['Interés Pagado', `$${parseFloat(datosPago.monto_interes || 0).toFixed(2)}`],
      ['Interés por Mora', `$${parseFloat(datosPago.monto_mora || 0).toFixed(2)}`],
      ['Método de Pago', datosPago.metodo_pago || 'EFECTIVO / QR'],
      ['Monto Total Abonado', `$${parseFloat(datosPago.monto_total).toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] }, // Sky 600
    styles: { fontSize: 10, cellPadding: 4 },
  });

  // Pie de página y Firma
  const finalY = doc.lastAutoTable.finalY + 30;
  doc.setLineWidth(0.5);
  doc.line(14, finalY, 80, finalY);
  doc.text('Firma Cajero / Operador', 14, finalY + 6);

  doc.line(130, finalY, 196, finalY);
  doc.text('Firma / Firma Cliente', 130, finalY + 6);

  // Descargar el archivo PDF
  doc.save(`Boleta_Pago_${datosPago.id_credito}_Cuota_${datosPago.nro_cuota}.pdf`);
};