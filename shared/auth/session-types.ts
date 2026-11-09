import type { TipoUsuario } from '@prisma/client'

/** Datos del usuario en sesión que se pueden compartir con el navegador. */
export interface UsuarioSesion {
  id: number
  nombre: string
  correo: string
  tipoUsuario: TipoUsuario
  /** ISO de cuándo inició la sesión. */
  inicioSesion: string
}
