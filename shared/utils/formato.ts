const ZONA = 'America/Mexico_City'

/** "09/11/2026, 01:25 p.m." o "-" si no hay fecha. */
export function formatoFechaHora(fecha: Date | string | null | undefined): string {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleString('es-MX', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "09/11/2026" o "-". */
export function formatoFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleDateString('es-MX', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' })
}

/** "$12,345.00" en la moneda indicada. */
export function formatoMoneda(monto: number | string | null | undefined, moneda = 'MXN'): string {
  const valor = Number(monto ?? 0)
  return valor.toLocaleString('es-MX', { style: 'currency', currency: moneda, minimumFractionDigits: 2 })
}

/** Valor para un input datetime-local en hora de México. */
export function aInputFechaHora(fecha: Date | string | null | undefined): string {
  if (!fecha) return ''
  const d = new Date(fecha)
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`
}

/** Duración legible entre dos fechas: "3 h 20 min", "2 d 4 h". */
export function formatoDuracion(segundos: number | null | undefined): string {
  if (segundos == null) return '-'
  const min = Math.floor(segundos / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h} h ${min % 60} min`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}

const diaMx = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: ZONA })

/** Último acceso legible: "Hoy 9:12", "Ayer 18:03", "12/10/2026" o "Nunca". `ahora` llega del servidor para no desfasar. */
export function formatoAcceso(fecha: Date | string | null | undefined, ahora: Date | string = new Date()): string {
  if (!fecha) return 'Nunca'
  const d = new Date(fecha), hoy = new Date(ahora)
  const hora = d.toLocaleTimeString('es-MX', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).replace(/^0(?=\d)/, '')
  if (diaMx(d) === diaMx(hoy)) return `Hoy ${hora}`
  if (diaMx(d) === diaMx(new Date(hoy.getTime() - 86_400_000))) return `Ayer ${hora}`
  return formatoFecha(d)
}

/** Si la fecha cae hoy (hora de México). */
export const esHoy = (fecha: Date | string | null | undefined, ahora: Date | string = new Date()) =>
  !!fecha && diaMx(new Date(fecha)) === diaMx(new Date(ahora))
