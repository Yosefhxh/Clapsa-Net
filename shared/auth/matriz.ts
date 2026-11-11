import 'server-only'

import { cache } from 'react'
import type { TipoUsuario } from '@prisma/client'
import prisma from '@/shared/lib/prisma'
import { resolverPermisos, type Permiso } from './permisos'

export const ROLES_SISTEMA: TipoUsuario[] = ['ADMIN', 'EDITOR', 'VIEWER']

/** Permisos efectivos de cada rol (con los ajustes de Configuración). Se lee una vez por petición. */
export const obtenerMatrizPermisos = cache(async (): Promise<Record<TipoUsuario, Permiso[]>> => {
  const ajustes = await prisma.permisoRol.findMany({ select: { rol: true, permiso: true, permitido: true } })
  return Object.fromEntries(ROLES_SISTEMA.map((rol) => [rol, resolverPermisos(rol, ajustes.filter((a) => a.rol === rol))])) as Record<TipoUsuario, Permiso[]>
})
