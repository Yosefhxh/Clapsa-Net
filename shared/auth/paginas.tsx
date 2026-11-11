import 'server-only'

import { redirect } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { obtenerUsuarioActual } from './session'
import { usuarioPuede, type Permiso } from './permisos'
import type { UsuarioSesion } from './session-types'

/**
 * Para páginas: sin sesión manda al login; con sesión pero sin permiso devuelve null
 * para que la página muestre <SinPermiso />.
 */
export async function usuarioConPermiso(permiso?: Permiso): Promise<UsuarioSesion | null> {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) redirect('/api/sesion/salir')
  if (permiso && !usuarioPuede(usuario, permiso)) return null
  return usuario
}

export function SinPermiso() {
  return (
    <div className="clp-card mx-auto mt-10 max-w-lg p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-aduanaBlue" aria-hidden />
      <h1 className="clp-page-title mt-3">No tienes acceso a esta sección</h1>
      <p className="clp-page-sub mt-2 text-sm">Pide a un administrador que revise tu rol en Usuarios.</p>
    </div>
  )
}
