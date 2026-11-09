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
 * Fase actual: la primera con pasos sin terminar. La fase 1 (apertura) depende de
 * cliente y documentos, que no son pasos.
 */
export function faseActual(pasos: PasoResumen[], ctx: Pick<ContextoOperacion, 'tieneCliente' | 'tieneImportador' | 'documentosObligatoriosAprobados'>): number {
  if (!ctx.tieneCliente || !ctx.tieneImportador || !ctx.documentosObligatoriosAprobados) return 1
  for (let fase = 2; fase <= 8; fase++) {
    if (pasos.some((p) => p.fase === fase && p.estado !== 'COMPLETADO' && p.estado !== 'NO_APLICA')) return fase
  }
  return 8
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
