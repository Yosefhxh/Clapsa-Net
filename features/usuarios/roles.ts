import type { TipoUsuario } from '@prisma/client'
import { PERMISOS } from '@/shared/auth/permisos'

/** Usuario tal como llega a la pantalla (sin contraseña). */
export interface UsuarioFila {
  id: number
  nombre: string
  correo: string
  tipoUsuario: TipoUsuario
  estado: 'ACTIVO' | 'INACTIVO'
  fechaRegistro: string
  ultimoAcceso: string | null
}

export const ROLES: Record<TipoUsuario, { nombre: string; corto: string; descripcion: string; tono: 'info' | 'ok' | 'neutro' }> = {
  ADMIN: { nombre: 'Administrador', corto: 'Admin', descripcion: 'Todo, incluido pedimento, cuenta de gastos, usuarios y configuración.', tono: 'info' },
  EDITOR: { nombre: 'Editor', corto: 'Editor', descripcion: 'Opera: crea operaciones, avanza pasos, revisa documentos y edita catálogos.', tono: 'ok' },
  VIEWER: { nombre: 'Consulta', corto: 'Consulta', descripcion: 'Solo puede ver la información.', tono: 'neutro' },
}

/** Lo que puede hacer un rol, tomado de la misma tabla de permisos que usa el servidor. */
export function permisosDeRol(rol: TipoUsuario): string[] {
  return Object.values(PERMISOS).filter((p) => (p.roles as readonly string[]).includes(rol)).map((p) => p.nombre)
}

/** Mismas reglas que valida el servidor al guardar la contraseña. */
export const REGLAS_PASSWORD: [string, (x: string) => boolean][] = [
  ['Mínimo 10 caracteres', (x) => x.length >= 10],
  ['Una mayúscula', (x) => /[A-Z]/.test(x)],
  ['Una minúscula', (x) => /[a-z]/.test(x)],
  ['Un número', (x) => /\d/.test(x)],
]

/** Contraseña aleatoria de 14 caracteres que cumple las reglas (sin caracteres que se confunden). */
export function generarPassword(): string {
  const M = 'ABCDEFGHJKLMNPQRSTUVWXYZ', m = 'abcdefghijkmnpqrstuvwxyz', d = '23456789', todo = M + m + d
  const azar = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n
  const letra = (s: string) => s[azar(s.length)]
  const c = [letra(M), letra(m), letra(d), ...Array.from({ length: 11 }, () => letra(todo))]
  for (let i = c.length - 1; i > 0; i--) { const j = azar(i + 1); [c[i], c[j]] = [c[j], c[i]] }
  return c.join('')
}
