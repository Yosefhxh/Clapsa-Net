import { describe, expect, it } from 'vitest'
import {
  avance,
  estadoOperacion,
  faseActual,
  motivoBloqueo,
  pasoAplica,
  pasoAplicaAlMedio,
  siguienteEstado,
  situacionOperacion,
  type ContextoOperacion,
  type PasoResumen,
} from './proceso'

const base: ContextoOperacion = {
  tipo: 'IMPO',
  tieneCliente: true,
  tieneImportador: true,
  documentosObligatoriosAprobados: true,
  estados: { CLASIFICACION: 'COMPLETADO', REVALIDACION_BL: 'COMPLETADO' },
}

describe('motivoBloqueo', () => {
  it('bloquea el pedimento sin cliente e importador', () => {
    expect(motivoBloqueo('DESPACHO_ADUANERO', { ...base, tieneImportador: false })).toBe('Falta asignar cliente e importador')
  })

  it('bloquea el pedimento sin documentos obligatorios', () => {
    expect(motivoBloqueo('DESPACHO_ADUANERO', { ...base, documentosObligatoriosAprobados: false })).toBe('Faltan documentos obligatorios aprobados')
  })

  it('bloquea el pedimento si falta clasificar', () => {
    expect(motivoBloqueo('DESPACHO_ADUANERO', { ...base, estados: { CLASIFICACION: 'EN_PROCESO' } })).toBe('Falta clasificar la mercancía')
  })

  it('libera el pedimento cuando todo está listo, y acepta revalidación que no aplica', () => {
    expect(motivoBloqueo('DESPACHO_ADUANERO', base)).toBeNull()
    expect(motivoBloqueo('DESPACHO_ADUANERO', { ...base, estados: { CLASIFICACION: 'COMPLETADO', REVALIDACION_BL: 'NO_APLICA' } })).toBeNull()
  })

  it('encadena pago → modulación → entrega', () => {
    expect(motivoBloqueo('PAGO_CONTRIBUCIONES', { ...base, estados: { DESPACHO_ADUANERO: 'EN_PROCESO' } })).toBe('Primero valida el pedimento')
    expect(motivoBloqueo('MODULACION', { ...base, estados: { PAGO_CONTRIBUCIONES: 'PENDIENTE' } })).toBe('Primero paga el pedimento')
    expect(motivoBloqueo('FT_NACIONAL', { ...base, estados: { MODULACION: 'RECONOCIMIENTO' } })).toBe('La mercancía aún no se libera')
  })

  it('en exportación el embarque espera a la modulación y no pide revalidación', () => {
    const expo: ContextoOperacion = { ...base, tipo: 'EXPO', estados: { CLASIFICACION: 'COMPLETADO' } }
    expect(motivoBloqueo('DESPACHO_ADUANERO', expo)).toBeNull()
    expect(motivoBloqueo('FLETE_MARITIMO', { ...expo, estados: { MODULACION: 'PENDIENTE' } })).toBe('La mercancía aún no se libera')
  })

  it('no bloquea pasos sin dependencias', () => {
    expect(motivoBloqueo('PREVIO_ORIGEN', { ...base, tieneCliente: false })).toBeNull()
  })
})

describe('siguienteEstado', () => {
  it('sigue el flujo normal', () => {
    expect(siguienteEstado('CLASIFICACION', 'PENDIENTE', 'INICIAR')).toBe('EN_PROCESO')
    expect(siguienteEstado('CLASIFICACION', 'EN_PROCESO', 'COMPLETAR')).toBe('COMPLETADO')
    expect(siguienteEstado('CLASIFICACION', 'COMPLETADO', 'REABRIR')).toBe('EN_PROCESO')
    expect(siguienteEstado('UVA', 'PENDIENTE', 'NO_APLICA')).toBe('NO_APLICA')
    expect(siguienteEstado('UVA', 'NO_APLICA', 'ACTIVAR')).toBe('PENDIENTE')
  })

  it('la modulación se completa con verde, o con rojo y luego liberar', () => {
    expect(siguienteEstado('MODULACION', 'EN_PROCESO', 'COMPLETAR')).toBeNull()
    expect(siguienteEstado('MODULACION', 'EN_PROCESO', 'MODULAR_VERDE')).toBe('COMPLETADO')
    expect(siguienteEstado('MODULACION', 'EN_PROCESO', 'MODULAR_ROJO')).toBe('RECONOCIMIENTO')
    expect(siguienteEstado('MODULACION', 'RECONOCIMIENTO', 'LIBERAR')).toBe('COMPLETADO')
  })

  it('rechaza transiciones inválidas', () => {
    expect(siguienteEstado('CLASIFICACION', 'PENDIENTE', 'COMPLETAR')).toBeNull()
    expect(siguienteEstado('CLASIFICACION', 'EN_PROCESO', 'MODULAR_VERDE')).toBeNull()
  })
})

describe('aplicabilidad', () => {
  const paso = { clave: 'REVALIDACION_BL' as const, faseImpo: 3, faseExpo: 0, medios: ['MARITIMO' as const], activo: true }
  it('respeta tipo de operación y medio', () => {
    expect(pasoAplica(paso, 'IMPO')).toBe(true)
    expect(pasoAplica(paso, 'EXPO')).toBe(false)
    expect(pasoAplicaAlMedio(paso, 'MARITIMO')).toBe(true)
    expect(pasoAplicaAlMedio(paso, 'AEREO')).toBe(false)
    expect(pasoAplicaAlMedio({ medios: [] }, 'AEREO')).toBe(true)
  })
})

describe('estado, avance y situación', () => {
  const pasos: PasoResumen[] = [
    { clave: 'CLASIFICACION', fase: 2, orden: 1, estado: 'COMPLETADO' },
    { clave: 'FLETE_AEREO', fase: 3, orden: 4, estado: 'NO_APLICA' },
    { clave: 'DESPACHO_ADUANERO', fase: 5, orden: 8, estado: 'COMPLETADO' },
    { clave: 'PAGO_CONTRIBUCIONES', fase: 6, orden: 9, estado: 'PENDIENTE' },
    { clave: 'MODULACION', fase: 7, orden: 10, estado: 'PENDIENTE' },
  ]
  const ctx = { tipo: 'IMPO' as const, tieneCliente: true, tieneImportador: true, documentosObligatoriosAprobados: true, cerrada: false }

  it('la operación sin importador queda en espera de cliente', () => {
    expect(estadoOperacion({ tieneCliente: true, tieneImportador: false, cerrada: false })).toBe('EN_ESPERA_CLIENTE')
    expect(estadoOperacion({ tieneCliente: false, tieneImportador: false, cerrada: true })).toBe('CERRADA')
  })

  it('el avance no cuenta los pasos que no aplican', () => {
    expect(avance(pasos)).toEqual({ completados: 2, total: 4, porcentaje: 50 })
  })

  it('la fase actual sigue a la actividad más avanzada', () => {
    expect(faseActual(pasos, ctx)).toBe(6)
    // Un paso opcional pendiente en una fase anterior no regresa la operación.
    const conUva = [...pasos, { clave: 'UVA' as const, fase: 2, orden: 2, estado: 'PENDIENTE' as const }]
    expect(faseActual(conUva, ctx)).toBe(6)
    const sinActividad = pasos.map((p) => ({ ...p, estado: p.estado === 'NO_APLICA' ? p.estado : ('PENDIENTE' as const) }))
    expect(faseActual(sinActividad, { ...ctx, documentosObligatoriosAprobados: false })).toBe(1)
    expect(faseActual(sinActividad, ctx)).toBe(2)
  })

  it('describe la situación para la bandeja', () => {
    expect(situacionOperacion(pasos, ctx)).toBe('Por pagar pedimento')
    expect(situacionOperacion(pasos, { ...ctx, tieneCliente: false })).toBe('En espera de cliente')
    const rojo = pasos.map((p) => (p.clave === 'MODULACION' ? { ...p, estado: 'RECONOCIMIENTO' as const } : p))
    expect(situacionOperacion(rojo, ctx)).toBe('En reconocimiento')
  })
})
