import { describe, expect, it } from 'vitest'
import { LISTA_PERMISOS, permisosPorDefecto, resolverPermisos, usuarioPuede } from './permisos'

describe('resolverPermisos', () => {
  it('sin ajustes usa los valores por omisión', () => {
    expect(resolverPermisos('EDITOR', [])).toEqual(permisosPorDefecto('EDITOR'))
    expect(resolverPermisos('VIEWER', [])).toEqual(['operaciones.ver'])
  })
  it('el administrador siempre tiene todos, aunque se guarde lo contrario', () => {
    expect(resolverPermisos('ADMIN', [{ permiso: 'usuarios.gestionar', permitido: false }])).toEqual(LISTA_PERMISOS)
  })
  it('aplica los ajustes guardados y nunca quita el permiso base', () => {
    const r = resolverPermisos('VIEWER', [
      { permiso: 'documentos.revisar', permitido: true },
      { permiso: 'operaciones.ver', permitido: false },
      { permiso: 'permiso.inventado', permitido: true },
    ])
    expect(r).toEqual(['operaciones.ver', 'documentos.revisar'])
    expect(resolverPermisos('EDITOR', [{ permiso: 'catalogos.editar', permitido: false }])).not.toContain('catalogos.editar')
  })
  it('usuarioPuede revisa los permisos resueltos del usuario', () => {
    expect(usuarioPuede({ permisos: ['operaciones.ver'] }, 'operaciones.operar')).toBe(false)
    expect(usuarioPuede({ permisos: ['operaciones.ver', 'operaciones.operar'] }, 'operaciones.operar')).toBe(true)
  })
})
