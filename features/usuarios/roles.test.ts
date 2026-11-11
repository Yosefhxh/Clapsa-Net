import { describe, expect, it } from 'vitest'
import { validarPasswordNueva } from '@/shared/auth/password'
import { permisosPorDefecto } from '@/shared/auth/permisos'
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
  it('los permisos salen de la matriz que resuelve el servidor', () => {
    const matriz = { ADMIN: permisosPorDefecto('ADMIN'), EDITOR: permisosPorDefecto('EDITOR'), VIEWER: permisosPorDefecto('VIEWER') }
    expect(permisosDeRol('VIEWER', matriz)).toEqual(['Ver operaciones'])
    expect(permisosDeRol('ADMIN', matriz)).toContain('Administrar usuarios')
    expect(permisosDeRol('EDITOR', { ...matriz, EDITOR: ['operaciones.ver', 'usuarios.gestionar'] })).toContain('Administrar usuarios')
  })
})
