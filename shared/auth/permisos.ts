import type { TipoUsuario } from '@prisma/client'

/**
 * Qué puede hacer cada rol. Es la única fuente de verdad: la usan las acciones del servidor
 * para autorizar y la pantalla de Configuración para mostrarlo.
 */
export const PERMISOS = {
  'operaciones.ver': { nombre: 'Ver operaciones', roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  'operaciones.operar': { nombre: 'Crear operaciones, asignar cliente y avanzar pasos', roles: ['ADMIN', 'EDITOR'] },
  'documentos.revisar': { nombre: 'Subir, aprobar o rechazar documentos', roles: ['ADMIN', 'EDITOR'] },
  'pedimento.gestionar': { nombre: 'Validar y pagar pedimento, modular', roles: ['ADMIN'] },
  'pasos.reabrir': { nombre: 'Reabrir pasos completados', roles: ['ADMIN'] },
  'cuenta.emitir': { nombre: 'Capturar cargos y emitir la cuenta de gastos', roles: ['ADMIN'] },
  'catalogos.editar': { nombre: 'Registrar y editar clientes y proveedores', roles: ['ADMIN', 'EDITOR'] },
  'catalogos.eliminar': { nombre: 'Eliminar clientes y proveedores', roles: ['ADMIN'] },
  'usuarios.gestionar': { nombre: 'Gestionar usuarios', roles: ['ADMIN'] },
  'configuracion.editar': { nombre: 'Cambiar la configuración', roles: ['ADMIN'] },
} as const satisfies Record<string, { nombre: string; roles: readonly TipoUsuario[] }>

export type Permiso = keyof typeof PERMISOS

export function tienePermiso(rol: TipoUsuario | string, permiso: Permiso): boolean {
  return (PERMISOS[permiso].roles as readonly string[]).includes(rol)
}
