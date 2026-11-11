import { describe, expect, it } from 'vitest'
import { esHoy, formatoAcceso } from './formato'

// 11/11/2026 12:00 en Ciudad de México (UTC-6).
const ahora = '2026-11-11T18:00:00Z'

describe('formatoAcceso', () => {
  it('dice Nunca sin fecha', () => expect(formatoAcceso(null, ahora)).toBe('Nunca'))
  it('hoy y ayer con hora de México', () => {
    expect(formatoAcceso('2026-11-11T15:12:00Z', ahora)).toBe('Hoy 9:12')
    expect(formatoAcceso('2026-11-11T00:03:00Z', ahora)).toBe('Ayer 18:03')
  })
  it('fecha corta cuando es más antiguo', () => expect(formatoAcceso('2026-10-12T18:00:00Z', ahora)).toBe('12/10/2026'))
  it('esHoy respeta la zona horaria', () => {
    expect(esHoy('2026-11-11T07:00:00Z', ahora)).toBe(true)
    expect(esHoy('2026-11-11T05:00:00Z', ahora)).toBe(false)
  })
})
