import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generarBoletaPagoPDF = (datosPago) => {
  const doc = new jsPDF();

  // Encabezado Institucional
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 32, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('SISTEMA DE GESTIÓN DE CRÉDITOS - INF-241', 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPROBANTE OFICIAL DE PAGO Y TRACEABILIDAD OPERATIVA', 14, 24);

  // Información General del Crédito y Cliente
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Comprobante N°: PAG-${datosPago.id_pago || Date.now()}`, 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha/Hora Transacción: ${new Date().toLocaleString('es-BO')}`, 14, 48);
  doc.text(`Cajero / Operador: ${datosPago.usuario_cajero || 'CAJERO SISTEMA'}`, 14, 54);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Cliente: ${datosPago.nombre_cliente}`, 120, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`C.I. / Documento: ${datosPago.ci_cliente}`, 120, 48);
  doc.text(`Nro. Crédito: #${datosPago.id_credito}`, 120, 54);

  // Detalle Financiero del Pago (RN08)
  doc.autoTable({
    startY: 62,
    head: [['Concepto / Componente', 'Detalle de Liquidación']],
    body: [
      ['Nro. de Cuota Cancelada', `Cuota N° ${datosPago.nro_cuota}`],
      ['Abono a Capital', `$${parseFloat(datosPago.monto_capital || 0).toFixed(2)}`],
      ['Interés Corriente', `$${parseFloat(datosPago.monto_interes || 0).toFixed(2)}`],
      ['Interés Penal por Mora (RN09)', `$${parseFloat(datosPago.monto_mora || 0).toFixed(2)}`],
      ['Método de Pago Seleccionado', datosPago.metodo_pago],
      ['MONTO TOTAL ABONADO', `$${parseFloat(datosPago.monto_total).toFixed(2)}`],
      ['SALDO RESTANTE DEL CRÉDITO (RN07)', `$${parseFloat(datosPago.saldo_restante || 0).toFixed(2)}`],
      ['NUEVO ESTADO DEL CRÉDITO (RN10)', datosPago.nuevo_estado_credito || 'VIGENTE'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] }, // Sky 600
    styles: { fontSize: 9, cellPadding: 3.5 },
  });

  // Pie de Página para Auditoría y Firmas (RNF03, RNF06)
  const finalY = doc.lastAutoTable.finalY + 25;
  doc.setLineWidth(0.5);
  doc.line(20, finalY, 80, finalY);
  doc.text('Firma Cajero Autorizado', 25, finalY + 5);

  doc.line(130, finalY, 190, finalY);
  doc.text('Firma / Conformidad Cliente', 132, finalY + 5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Documento generado automáticamente por el Sistema INF-241. Válido como recibo legal de pago.', 14, finalY + 20);

  // Descargar Archivo
  doc.save(`Comprobante_Pago_Credito_${datosPago.id_credito}_Cuota_${datosPago.nro_cuota}.pdf`);
};