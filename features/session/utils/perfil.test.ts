import { describe, expect, it } from 'vitest'
import { inicialesDe, textoIngreso } from './perfil'

describe('inicialesDe', () => {
  it('usa las dos primeras palabras', () => {
    expect(inicialesDe('Super Admin')).toBe('SA')
    expect(inicialesDe('laura méndez ortiz')).toBe('LM')
    expect(inicialesDe('Clasificador')).toBe('C')
    expect(inicialesDe('  ')).toBe('?')
  })
})

describe('textoIngreso', () => {
  const ingreso = new Date(2026, 10, 9, 9, 12)
  it('dice "hoy" si fue el mismo día', () => {
    expect(textoIngreso(ingreso, new Date(2026, 10, 9, 18, 0))).toMatch(/^Ingresó hoy, 9 de noviembre de 2026 · 9:12/)
  })
  it('dice "el" si fue otro día', () => {
    expect(textoIngreso(ingreso, new Date(2026, 10, 10, 8, 0))).toMatch(/^Ingresó el 9 de noviembre de 2026 · 9:12/)
  })
})
