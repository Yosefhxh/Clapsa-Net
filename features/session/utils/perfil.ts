import type { TipoUsuario } from '@prisma/client'

export const ETIQUETA_ROL: Record<TipoUsuario, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  VIEWER: 'Consulta',
}

/** Iniciales para el avatar: primera letra de las dos primeras palabras. */
export function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  return palabras.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'
}

/** "Ingresó hoy, 9 de noviembre de 2026 · 9:12 a.m." (o "Ingresó el …" si fue otro día). */
export function textoIngreso(ingreso: Date, ahora: Date): string {
  const fecha = ingreso.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const hora = ingreso.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })
  const mismoDia = ingreso.toDateString() === ahora.toDateString()
  return `Ingresó ${mismoDia ? 'hoy' : 'el'}${mismoDia ? ',' : ''} ${fecha} · ${hora}`
}
