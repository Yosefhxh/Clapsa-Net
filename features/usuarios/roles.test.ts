import { describe, expect, it } from 'vitest'
import { validarPasswordNueva } from '@/shared/auth/password'
import { generarPassword, permisosDeRol, REGLAS_PASSWORD } from './roles'

describe('roles de usuario', () => {
  it('la contraseña generada cumple las reglas del servidor', () => {
    for (let i = 0; i < 50; i++) {
      const p = generarPassword()
      expect(p).toHaveLength(14)
      expect(validarPasswordNueva(p)).toBeNull()
      expect(REGLAS_PASSWORD.every(([, f]) => f(p))).toBe(true)
    }
  })
  it('los permisos salen de la tabla del servidor', () => {
    expect(permisosDeRol('VIEWER')).toEqual(['Ver operaciones'])
    expect(permisosDeRol('ADMIN')).toContain('Gestionar usuarios')
    expect(permisosDeRol('EDITOR')).not.toContain('Gestionar usuarios')
  })
})
