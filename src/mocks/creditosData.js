// src/mocks/creditosData.js

export const mockSolicitudes = [
  {
    id_solicitud: 101,
    fecha_solicitud: "2026-10-15",
    monto_solicitado: 30000.00,
    plazo_meses: 12,
    destino: "Capital de Trabajo",
    estado: "EN_EVALUACION",
    cliente: {
      id_cliente: 1,
      ci: "4521378",
      nombres: "Maria",
      apellidos: "López",
      ingresos_mensuales: 6500.00
    },
    evaluacion: {
      id_evaluacion: 1,
      ingresos: 6500.00,
      gastos: 4200.00,
      capacidad_pago: 2300.00,
      nivel_riesgo: "BAJO",
      resultado: "FAVORABLE"
    }
  },
  {
    id_solicitud: 102,
    fecha_solicitud: "2026-10-16",
    monto_solicitado: 50000.00,
    plazo_meses: 24,
    destino: "Compra de Maquinaria",
    estado: "REGISTRADA",
    cliente: {
      id_cliente: 2,
      ci: "8765432",
      nombres: "Carlos",
      apellidos: "Mendoza",
      ingresos_mensuales: 4000.00
    },
    evaluacion: null // Aún no evaluada
  }
];