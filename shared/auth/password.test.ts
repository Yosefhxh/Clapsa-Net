import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashearPassword, validarPasswordNueva, verificarPassword } from './password'

describe('contraseñas', () => {
  it('verifica un hash scrypt y no requiere actualizar', async () => {
    const hash = await hashearPassword('ClaveSegura2026')
    expect(hash.startsWith('scrypt:')).toBe(true)
    expect(await verificarPassword('ClaveSegura2026', hash)).toEqual({ valida: true, requiereActualizar: false })
    expect((await verificarPassword('otra', hash)).valida).toBe(false)
  })

  it('genera sal distinta cada vez', async () => {
    expect(await hashearPassword('igual')).not.toBe(await hashearPassword('igual'))
  })

  it('acepta el formato SHA-256 anterior y pide actualizarlo', async () => {
    const antiguo = `sha256:${createHash('sha256').update('Vieja123').digest('hex')}`
    expect(await verificarPassword('Vieja123', antiguo)).toEqual({ valida: true, requiereActualizar: true })
    expect((await verificarPassword('mal', antiguo)).valida).toBe(false)
  })

  it('valida reglas mínimas para contraseñas nuevas', () => {
    expect(validarPasswordNueva('corta1A')).toMatch(/10 caracteres/)
    expect(validarPasswordNueva('sinmayuscula123')).toMatch(/mayúscula/)
    expect(validarPasswordNueva('ClaveSegura2026')).toBeNull()
  })
})
