import type { EstadoPaso, HitoOperativo, MedioTransporte, TipoOperacion } from '@prisma/client'

/** Nombres de las 8 fases según el tipo de operación. */
export const FASES: Record<TipoOperacion, readonly string[]> = {
  IMPO: [
    'Apertura del expediente',
    'Clasificación y regulaciones',
    'Arribo y revalidación',
    'Previo',
    'Pedimento',
    'Pago de contribuciones',
    'Modulación y liberación',
    'Entrega y cierre',
  ],
  EXPO: [
    'Apertura del expediente',
    'Clasificación y regulaciones',
    'Previo y carga en origen',
    'Pedimento de exportación',
    'Traslado e ingreso al recinto',
    'Modulación',
    'Embarque y zarpe',
    'Cierre',
  ],
}

/** Requisitos que no son pasos: se cumplen con datos de la operación. */
export type Requisito = 'CLIENTE' | 'DOCUMENTOS'
type Dependencia = HitoOperativo | Requisito

/**
 * Qué debe estar listo antes de iniciar cada paso. Un paso dependiente se considera listo
 * si está COMPLETADO o NO_APLICA (o si la operación no lo tiene).
 */
export const DEPENDENCIAS: Record<TipoOperacion, Partial<Record<HitoOperativo, Dependencia[]>>> = {
  IMPO: {
    DESPACHO_ADUANERO: ['CLIENTE', 'DOCUMENTOS', 'CLASIFICACION', 'REVALIDACION_BL'],
    PAGO_CONTRIBUCIONES: ['DESPACHO_ADUANERO'],
    MODULACION: ['PAGO_CONTRIBUCIONES'],
    FT_NACIONAL: ['MODULACION'],
    MANIOBRAS_ALMACEN: ['MODULACION'],
    CUENTA_GASTOS: ['MODULACION', 'FT_NACIONAL'],
  },
  EXPO: {
    DESPACHO_ADUANERO: ['CLIENTE', 'DOCUMENTOS', 'CLASIFICACION'],
    PAGO_CONTRIBUCIONES: ['DESPACHO_ADUANERO'],
    MODULACION: ['PAGO_CONTRIBUCIONES'],
    FLETE_MARITIMO: ['MODULACION'],
    FLETE_AEREO: ['MODULACION'],
    CUENTA_GASTOS: ['MODULACION'],
  },
}

const MOTIVO: Record<Dependencia, string> = {
  CLIENTE: 'Falta asignar cliente e importador',
  DOCUMENTOS: 'Faltan documentos obligatorios aprobados',
  CLASIFICACION: 'Falta clasificar la mercancía',
  REVALIDACION_BL: 'Falta revalidar el BL',
  DESPACHO_ADUANERO: 'Primero valida el pedimento',
  PAGO_CONTRIBUCIONES: 'Primero paga el pedimento',
  MODULACION: 'La mercancía aún no se libera',
  FT_NACIONAL: 'Falta la entrega (F.T. Nacional)',
  PREVIO_ORIGEN: 'Falta el previo',
  FLETE_MARITIMO: 'Falta el flete marítimo',
  FLETE_AEREO: 'Falta el flete aéreo',
  FT_INTERMODAL: 'Falta el F.T. intermodal',
  UVA: 'Falta la UVA',
  ALMACENAJE: 'Falta el almacenaje',
  MANIOBRAS_ALMACEN: 'Faltan las maniobras en almacén',
  MANIOBRAS_PORTUARIAS: 'Faltan las maniobras portuarias',
  OTRAS: 'Faltan otros servicios',
  CUENTA_GASTOS: 'Falta la cuenta de gastos',
}

export interface PasoCatalogo {
  clave: HitoOperativo
  faseImpo: number
  faseExpo: number
  medios: MedioTransporte[]
  activo: boolean
}

/** Si un paso del catálogo forma parte de una operación de ese tipo y medio. */
export function pasoAplica(paso: PasoCatalogo, tipo: TipoOperacion): boolean {
  return paso.activo && faseDelPaso(paso, tipo) > 0
}

/** Si el paso aplica por medio de transporte (si no, se crea como NO_APLICA). */
export function pasoAplicaAlMedio(paso: Pick<PasoCatalogo, 'medios'>, medio: MedioTransporte): boolean {
  return paso.medios.length === 0 || paso.medios.includes(medio)
}

export const faseDelPaso = (paso: Pick<PasoCatalogo, 'faseImpo' | 'faseExpo'>, tipo: TipoOperacion) =>
  tipo === 'IMPO' ? paso.faseImpo : paso.faseExpo

export interface ContextoOperacion {
  tipo: TipoOperacion
  tieneCliente: boolean
  tieneImportador: boolean
  documentosObligatoriosAprobados: boolean
  estados: Partial<Record<HitoOperativo, EstadoPaso>>
}

const listo = (estado: EstadoPaso | undefined) => estado === undefined || estado === 'COMPLETADO' || estado === 'NO_APLICA'

/** Primer motivo por el que un paso no puede iniciarse, o null si está libre. */
export function motivoBloqueo(clave: HitoOperativo, ctx: ContextoOperacion): string | null {
  for (const dep of DEPENDENCIAS[ctx.tipo][clave] ?? []) {
    if (dep === 'CLIENTE' && !(ctx.tieneCliente && ctx.tieneImportador)) return MOTIVO.CLIENTE
    if (dep === 'DOCUMENTOS' && !ctx.documentosObligatoriosAprobados) return MOTIVO.DOCUMENTOS
    if (dep !== 'CLIENTE' && dep !== 'DOCUMENTOS' && !listo(ctx.estados[dep])) return MOTIVO[dep]
  }
  return null
}

/** Acciones posibles sobre un paso. */
export type AccionPaso = 'INICIAR' | 'COMPLETAR' | 'NO_APLICA' | 'ACTIVAR' | 'REABRIR' | 'MODULAR_VERDE' | 'MODULAR_ROJO' | 'LIBERAR'

/** Transiciones válidas: estado actual → acción → estado nuevo. */
const TRANSICIONES: Record<EstadoPaso, Partial<Record<AccionPaso, EstadoPaso>>> = {
  PENDIENTE: { INICIAR: 'EN_PROCESO', NO_APLICA: 'NO_APLICA' },
  EN_PROCESO: { COMPLETAR: 'COMPLETADO', MODULAR_VERDE: 'COMPLETADO', MODULAR_ROJO: 'RECONOCIMIENTO', REABRIR: 'PENDIENTE' },
  RECONOCIMIENTO: { LIBERAR: 'COMPLETADO' },
  COMPLETADO: { REABRIR: 'EN_PROCESO' },
  NO_APLICA: { ACTIVAR: 'PENDIENTE' },
}

/** Estado resultante, o null si la acción no es válida para ese paso. */
export function siguienteEstado(clave: HitoOperativo, actual: EstadoPaso, accion: AccionPaso): EstadoPaso | null {
  const esModulacion = clave === 'MODULACION'
  if (esModulacion && accion === 'COMPLETAR') return null // la modulación se completa con Verde o Rojo→Liberar
  if (!esModulacion && (accion === 'MODULAR_VERDE' || accion === 'MODULAR_ROJO' || accion === 'LIBERAR')) return null
  return TRANSICIONES[actual][accion] ?? null
}

export type EstadoOperacion = 'EN_ESPERA_CLIENTE' | 'EN_PROCESO' | 'CERRADA'

export function estadoOperacion(ctx: { tieneCliente: boolean; tieneImportador: boolean; cerrada: boolean }): EstadoOperacion {
  if (ctx.cerrada) return 'CERRADA'
  if (!ctx.tieneCliente || !ctx.tieneImportador) return 'EN_ESPERA_CLIENTE'
  return 'EN_PROCESO'
}

export interface PasoResumen {
  clave: HitoOperativo
  fase: number
  orden: number
  estado: EstadoPaso
}

/** Avance contando solo los pasos que aplican. */
export function avance(pasos: PasoResumen[]) {
  const aplican = pasos.filter((p) => p.estado !== 'NO_APLICA')
  const completados = aplican.filter((p) => p.estado === 'COMPLETADO').length
  return { completados, total: aplican.length, porcentaje: aplican.length ? Math.round((completados / aplican.length) * 100) : 0 }
}

/**
 * Fase actual: la más avanzada en la que ya se trabajó; si esa fase quedó completa, la
 * siguiente que tenga pasos. Así un paso opcional olvidado (p. ej. UVA) no "regresa" la
 * operación a una fase anterior. Sin actividad: fase 1 hasta tener cliente y documentos.
 */
export function faseActual(pasos: PasoResumen[], ctx: Pick<ContextoOperacion, 'tieneCliente' | 'tieneImportador' | 'documentosObligatoriosAprobados'>): number {
  const aperturaLista = ctx.tieneCliente && ctx.tieneImportador && ctx.documentosObligatoriosAprobados
  const aplican = pasos.filter((p) => p.estado !== 'NO_APLICA')
  const conActividad = aplican.filter((p) => p.estado !== 'PENDIENTE')
  if (!conActividad.length) return aperturaLista ? 2 : 1

  const masAvanzada = Math.max(...conActividad.map((p) => p.fase))
  const terminada = aplican.filter((p) => p.fase === masAvanzada).every((p) => p.estado === 'COMPLETADO')
  if (!terminada) return masAvanzada
  const siguiente = aplican.map((p) => p.fase).filter((f) => f > masAvanzada).sort((a, b) => a - b)[0]
  return siguiente ?? masAvanzada
}

/** Etiqueta corta de la situación de la operación, para la bandeja y el Home. */
export function situacionOperacion(
  pasos: PasoResumen[],
  ctx: Pick<ContextoOperacion, 'tipo' | 'tieneCliente' | 'tieneImportador' | 'documentosObligatoriosAprobados'> & { cerrada: boolean },
): string {
  const estado = estadoOperacion(ctx)
  if (estado === 'CERRADA') return 'Cerrada'
  if (estado === 'EN_ESPERA_CLIENTE') return 'En espera de cliente'
  const de = (c: HitoOperativo) => pasos.find((p) => p.clave === c)?.estado
  if (de('MODULACION') === 'RECONOCIMIENTO') return 'En reconocimiento'
  if (de('MODULACION') === 'COMPLETADO') return ctx.tipo === 'IMPO' ? 'Desaduanada' : 'Despachada'
  if (de('DESPACHO_ADUANERO') === 'COMPLETADO' && de('PAGO_CONTRIBUCIONES') !== 'COMPLETADO') return 'Por pagar pedimento'
  return FASES[ctx.tipo][faseActual(pasos, ctx) - 1]
}

/** Columnas del tablero de operaciones (aprobadas en la fase 7 del rediseño). */
export const COLUMNAS_TABLERO = [
  { id: 'espera', nombre: 'En espera de cliente', color: '#3157C2' },
  { id: 'previo', nombre: 'Previo en origen', color: '#5B86E5' },
  { id: 'transito', nombre: 'En tránsito', color: '#17677D' },
  { id: 'pedimento', nombre: 'Por pagar pedimento', color: '#E3A23B' },
  { id: 'reconocimiento', nombre: 'En reconocimiento', color: '#E0614F' },
  { id: 'desaduanado', nombre: 'Desaduanado', color: '#2E9E7A' },
] as const

export type ColumnaTablero = (typeof COLUMNAS_TABLERO)[number]['id']

/** Columna por fase cuando la modulación aún no ocurre (índice = fase - 1). */
const COLUMNA_POR_FASE: Record<TipoOperacion, ColumnaTablero[]> = {
  // 1 Apertura · 2 Clasificación · 3 Arribo → tránsito; 4 Previo; 5 Pedimento · 6 Pago · 7 en espera de modular → pedimento; 8 Entrega.
  IMPO: ['transito', 'transito', 'transito', 'previo', 'pedimento', 'pedimento', 'pedimento', 'desaduanado'],
  // 1-3 → previo en origen; 4 Pedimento; 5 Traslado · 6 en espera de modular → tránsito; 7 Embarque · 8 Cierre.
  EXPO: ['previo', 'previo', 'previo', 'pedimento', 'transito', 'transito', 'desaduanado', 'desaduanado'],
}

/** En qué columna del tablero va una operación; las cerradas no van en el tablero. */
export function columnaTablero(o: {
  tipo: TipoOperacion
  estado: EstadoOperacion
  fase: number
  estadosPasos: Partial<Record<HitoOperativo, EstadoPaso>>
}): ColumnaTablero | null {
  if (o.estado === 'CERRADA') return null
  if (o.estado === 'EN_ESPERA_CLIENTE') return 'espera'
  const modulacion = o.estadosPasos.MODULACION
  if (modulacion === 'RECONOCIMIENTO') return 'reconocimiento'
  if (modulacion === 'COMPLETADO') return 'desaduanado'
  return COLUMNA_POR_FASE[o.tipo][Math.min(8, Math.max(1, o.fase)) - 1]
}

/**
 * Lo siguiente que hay que hacer en la operación: primero cliente y documentos; después el
 * paso en curso (o en reconocimiento) más temprano; si no hay, el primer pendiente que ya se pueda iniciar.
 */
export function proximoPaso(
  pasos: (PasoResumen & { nombre: string })[],
  ctx: ContextoOperacion & { cerrada: boolean },
): string {
  if (ctx.cerrada) return 'Operación cerrada'
  if (!ctx.tieneCliente || !ctx.tieneImportador) return 'Asignar cliente e importador'
  const orden = [...pasos].sort((a, b) => a.fase - b.fase || a.orden - b.orden)
  const reconocimiento = orden.find((p) => p.estado === 'RECONOCIMIENTO')
  if (reconocimiento) return 'Liberar tras reconocimiento'
  const enCurso = orden.find((p) => p.estado === 'EN_PROCESO')
  if (enCurso) return enCurso.nombre
  const libre = orden.find((p) => p.estado === 'PENDIENTE' && !motivoBloqueo(p.clave, ctx))
  if (libre) return libre.nombre
  if (!ctx.documentosObligatoriosAprobados) return 'Aprobar documentos obligatorios'
  return orden.some((p) => p.estado === 'PENDIENTE') ? 'Resolver pasos bloqueados' : 'Cerrar la operación'
}
