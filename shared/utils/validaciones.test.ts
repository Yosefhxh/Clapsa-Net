import { describe, expect, it } from 'vitest'
import { normalizarContenedor, normalizarPedimento, validarRfc } from './validaciones'

describe('validarRfc', () => {
  it('distingue persona moral y física', () => {
    expect(validarRfc('EIP190401KJ2')).toEqual({ valido: true, persona: 'MORAL' })
    expect(validarRfc('sohy850312ab4')).toEqual({ valido: true, persona: 'FISICA' })
    expect(validarRfc('ABC12')).toEqual({ valido: false, persona: null })
  })
})

describe('normalizarPedimento', () => {
  it('acepta 15 dígitos con o sin espacios', () => {
    expect(normalizarPedimento('261637116001850')).toBe('26 16 3711 6001850')
    expect(normalizarPedimento('26 16 3711 6001850')).toBe('26 16 3711 6001850')
  })
  it('rechaza longitudes incorrectas', () => {
    expect(normalizarPedimento('26 16 3711 600185')).toBeNull()
  })
})

describe('normalizarContenedor', () => {
  it('valida el dígito verificador ISO 6346', () => {
    expect(normalizarContenedor('CSQU3054383')).toBe('CSQU 305438-3')
    expect(normalizarContenedor('msku 482915-3')).toBeNull() // dígito incorrecto
    expect(normalizarContenedor('CSQU3054384')).toBeNull()
    expect(normalizarContenedor('XYZ')).toBeNull()
  })
})
