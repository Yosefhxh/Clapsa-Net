import { describe, expect, it } from 'vitest'
import { inicialesEmpresa, tonoAvatar } from './avatar'

describe('inicialesEmpresa', () => {
  it('ignora la forma societaria y los conectores', () => {
    expect(inicialesEmpresa('Importaciones del Pacífico S.A. de C.V.')).toBe('IP')
    expect(inicialesEmpresa('Comercial Manzanillo S.A. de C.V.')).toBe('CM')
    expect(inicialesEmpresa('MARIO ALBERTO RUIZ CASTRO')).toBe('MA')
    expect(inicialesEmpresa('Agroexport')).toBe('A')
  })
})

describe('tonoAvatar', () => {
  it('es estable para el mismo texto', () => {
    expect(tonoAvatar('Clapsa')).toEqual(tonoAvatar('Clapsa'))
  })
})
