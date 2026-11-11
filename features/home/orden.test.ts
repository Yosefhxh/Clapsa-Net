import { describe, expect, it } from 'vitest'
import { mover, normalizarOrden, TABLERO_HOME } from './orden'

describe('normalizarOrden', () => {
  it('respeta lo guardado y completa lo que falta', () => {
    expect(normalizarOrden(['avisos'], ['tabla', 'avisos'])).toEqual(['avisos', 'tabla'])
  })
  it('ignora valores inválidos o repetidos', () => {
    expect(normalizarOrden(['x', 'avisos', 'avisos', 3], ['tabla', 'avisos'])).toEqual(['avisos', 'tabla'])
    expect(normalizarOrden(null, TABLERO_HOME)).toEqual([...TABLERO_HOME])
  })
})

describe('mover', () => {
  it('lleva el elemento a la posición indicada', () => {
    expect(mover(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a'])
    expect(mover(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
  })
  it('no cambia nada si el destino no es válido', () => {
    const l = ['a', 'b']
    expect(mover(l, 'a', 5)).toBe(l)
    expect(mover(l, 'z', 0)).toBe(l)
  })
})
