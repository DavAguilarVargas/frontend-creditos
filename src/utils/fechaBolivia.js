const ZONA_BOLIVIA = 'America/La_Paz';

const fmtFecha = new Intl.DateTimeFormat('es-BO', {
  timeZone: ZONA_BOLIVIA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const fmtFechaHora = new Intl.DateTimeFormat('es-BO', {
  timeZone: ZONA_BOLIVIA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function pareceFechaPura(texto) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto);
}

function parsearInstante(value) {
  if (value instanceof Date) return value;
  const texto = String(value ?? '').trim();
  if (!texto) return null;

  // Postgres timestamp without time zone se ha almacenado como UTC-naive:
  // explícitamente añadimos Z para evitar que el equipo local interprete su zona.
  const timestampSinZona = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2})(\.\d{1,6})?)?$/.exec(texto);
  const normalizado = timestampSinZona
    ? `${timestampSinZona[1]}T${timestampSinZona[2]}:${timestampSinZona[3] || '00'}${timestampSinZona[4] || ''}Z`
    : texto;
  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Formatea una fecha DATE de PostgreSQL sin desplazar el día por zona horaria. */
export function formatoFechaBolivia(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  const texto = String(value).trim();
  if (pareceFechaPura(texto)) {
    const [, yyyy, mm, dd] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    return `${dd}/${mm}/${yyyy}`;
  }
  const fecha = parsearInstante(value);
  return fecha ? fmtFecha.format(fecha) : texto;
}

/** Formatea un instante ISO o un timestamp UTC-naive en hora de Bolivia. */
export function formatoFechaHoraBolivia(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  const texto = String(value).trim();
  const fecha = parsearInstante(value);
  return fecha ? fmtFechaHora.format(fecha) : texto;
}

/**
 * Formatea un string que YA fue convertido por PostgreSQL a pared local de Bolivia
 * (formato YYYY-MM-DD HH:mm:ss). No se vuelve a convertir ni se desplaza 4 horas.
 */
export function formatoFechaHoraLocalBolivia(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  const texto = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(texto);
  if (match) return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}:${match[6] || '00'}`;
  return formatoFechaHoraBolivia(value, fallback);
}

/** Devuelve YYYY-MM-DD del día operativo en Bolivia, sin depender de la zona de Windows. */
export function fechaActualISOBolivia() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_BOLIVIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

export { ZONA_BOLIVIA };
