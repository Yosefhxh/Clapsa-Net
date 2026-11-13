import type { TipoUsuario } from '@prisma/client'
import type { Permiso } from './permisos'

/** Datos del usuario en sesión que se pueden compartir con el navegador. */
export interface UsuarioSesion {
  id: number
  nombre: string
  correo: string
  tipoUsuario: TipoUsuario
  /** ISO de cuándo inició la sesión. */
  inicioSesion: string
  /** Permisos efectivos de su rol (resueltos en el servidor con los ajustes de Configuración). */
  permisos: Permiso[]
}
