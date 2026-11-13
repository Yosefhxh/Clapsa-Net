import type { TipoUsuario } from '@prisma/client'

/**
 * Permisos del sistema y lo que trae cada rol por omisión. Los roles Editor y Consulta se
 * pueden ajustar en Configuración (tabla PermisoRol); el Administrador siempre tiene todos.
 */
export const PERMISOS = {
  'operaciones.ver': { nombre: 'Ver operaciones', descripcion: 'Entrar al sistema y consultar operaciones, clientes y proveedores.', grupo: 'Operaciones', roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  'operaciones.operar': { nombre: 'Crear operaciones, asignar cliente y avanzar pasos', descripcion: 'Abre expedientes nuevos, elige cliente e importador y avanza el proceso.', grupo: 'Operaciones', roles: ['ADMIN', 'EDITOR'] },
  'documentos.revisar': { nombre: 'Subir, aprobar o rechazar documentos', descripcion: 'Revisa factura, BL, packing list y demás.', grupo: 'Operaciones', roles: ['ADMIN', 'EDITOR'] },
  'pasos.reabrir': { nombre: 'Reabrir pasos completados', descripcion: 'Regresa un paso a "En proceso"; queda en la bitácora.', grupo: 'Operaciones', roles: ['ADMIN'] },
  'pedimento.gestionar': { nombre: 'Validar y pagar pedimento, modular', descripcion: 'Valida el pedimento, registra el pago y la modulación.', grupo: 'Pedimento y cobranza', roles: ['ADMIN'] },
  'cuenta.emitir': { nombre: 'Capturar cargos y emitir la cuenta de gastos', descripcion: 'Arma la cuenta de gastos y cierra la operación.', grupo: 'Pedimento y cobranza', roles: ['ADMIN'] },
  'catalogos.editar': { nombre: 'Registrar y editar clientes y proveedores', descripcion: 'Altas y cambios en Clientes y Proveedores.', grupo: 'Catálogos', roles: ['ADMIN', 'EDITOR'] },
  'catalogos.eliminar': { nombre: 'Dar de baja clientes y proveedores', descripcion: 'Marca inactivos o reactiva clientes y proveedores.', grupo: 'Catálogos', roles: ['ADMIN'] },
  'usuarios.gestionar': { nombre: 'Administrar usuarios', descripcion: 'Altas, bajas, roles y restablecer contraseñas.', grupo: 'Sistema', roles: ['ADMIN'] },
  'configuracion.editar': { nombre: 'Cambiar la configuración', descripcion: 'Agencia, aduanas, proceso, documentos y alertas.', grupo: 'Sistema', roles: ['ADMIN'] },
} as const satisfies Record<string, { nombre: string; descripcion: string; grupo: string; roles: readonly TipoUsuario[] }>

export type Permiso = keyof typeof PERMISOS

export const LISTA_PERMISOS = Object.keys(PERMISOS) as Permiso[]

/** Sin este permiso nadie puede usar el sistema: siempre está activo. */
export const PERMISOS_BASE: Permiso[] = ['operaciones.ver']

export const esPermiso = (p: string): p is Permiso => p in PERMISOS

/** Lo que trae el rol por omisión (antes de los ajustes de Configuración). */
export function tienePermiso(rol: TipoUsuario | string, permiso: Permiso): boolean {
  return (PERMISOS[permiso].roles as readonly string[]).includes(rol)
}

export function permisosPorDefecto(rol: TipoUsuario): Permiso[] {
  return LISTA_PERMISOS.filter((p) => tienePermiso(rol, p))
}

/**
 * Permisos efectivos de un rol: los ajustes guardados y, para lo que no tenga ajuste, el valor
 * por omisión. El Administrador tiene todos y los permisos base no se pueden quitar.
 */
export function resolverPermisos(rol: TipoUsuario, ajustes: { permiso: string; permitido: boolean }[]): Permiso[] {
  if (rol === 'ADMIN') return [...LISTA_PERMISOS]
  const guardado = new Map(ajustes.filter((a) => esPermiso(a.permiso)).map((a) => [a.permiso as Permiso, a.permitido]))
  return LISTA_PERMISOS.filter((p) => PERMISOS_BASE.includes(p) || (guardado.get(p) ?? tienePermiso(rol, p)))
}

/** Si el usuario en sesión tiene el permiso (sus permisos se resuelven en el servidor). */
export function usuarioPuede(usuario: { permisos: readonly Permiso[] }, permiso: Permiso): boolean {
  return usuario.permisos.includes(permiso)
}
