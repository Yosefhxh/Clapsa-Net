import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { EstadoUsuario } from '@prisma/client'
import prisma from '@/shared/lib/prisma'
import { obtenerMatrizPermisos } from './matriz'
import { usuarioPuede, type Permiso } from './permisos'
import type { UsuarioSesion } from './session-types'

export const COOKIE_SESION = 'clapsa_sesion'
const DURACION_MS = 12 * 60 * 60 * 1000

export type { UsuarioSesion }

export class ErrorAutorizacion extends Error {
  constructor(mensaje = 'No tienes permiso para hacer esta acción.') {
    super(mensaje)
    this.name = 'ErrorAutorizacion'
  }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Crea la sesión en BD y deja el token en una cookie httpOnly. */
export async function crearSesion(usuarioId: number) {
  const token = randomBytes(32).toString('base64url')
  const expiraEn = new Date(Date.now() + DURACION_MS)
  await prisma.sesion.create({ data: { id: hashToken(token), usuarioId, expiraEn } })
  const almacen = await cookies()
  almacen.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiraEn,
  })
}

export async function cerrarSesion() {
  const almacen = await cookies()
  const token = almacen.get(COOKIE_SESION)?.value
  if (token) await prisma.sesion.deleteMany({ where: { id: hashToken(token) } })
  almacen.delete(COOKIE_SESION)
}

/** Usuario de la petición actual, o null. Se memoriza por petición. */
export const obtenerUsuarioActual = cache(async (): Promise<UsuarioSesion | null> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value
  if (!token) return null

  const sesion = await prisma.sesion.findUnique({
    where: { id: hashToken(token) },
    include: { usuario: { select: { id: true, nombre: true, correo: true, tipoUsuario: true, estado: true } } },
  })
  if (!sesion) return null

  if (sesion.expiraEn <= new Date() || sesion.usuario.estado !== EstadoUsuario.ACTIVO) {
    await prisma.sesion.delete({ where: { id: sesion.id } }).catch(() => undefined)
    return null
  }

  const { id, nombre, correo, tipoUsuario } = sesion.usuario
  const permisos = (await obtenerMatrizPermisos())[tipoUsuario]
  return { id, nombre, correo, tipoUsuario, inicioSesion: sesion.createdAt.toISOString(), permisos }
})

/** Exige sesión y, si se indica, un permiso. Lanza ErrorAutorizacion si no se cumple. */
export async function requerirUsuario(permiso?: Permiso): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) throw new ErrorAutorizacion('Tu sesión terminó. Vuelve a iniciar sesión.')
  if (permiso && !usuarioPuede(usuario, permiso)) throw new ErrorAutorizacion()
  return usuario
}

/** Cierra todas las sesiones de un usuario (al desactivarlo o cambiar su contraseña). */
export async function cerrarSesionesDeUsuario(usuarioId: number) {
  await prisma.sesion.deleteMany({ where: { usuarioId } })
}
