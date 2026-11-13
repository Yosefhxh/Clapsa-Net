import 'server-only';

import prisma from '@/shared/lib/prisma';
import { EstadoUsuario, Prisma, TipoUsuario, type Usuario } from '@prisma/client';

/** Campos seguros para enviar al navegador (nunca el hash de la contraseña). */
const camposPublicos = {
  id: true,
  nombre: true,
  correo: true,
  tipoUsuario: true,
  estado: true,
  fechaRegistro: true,
  ultimoAcceso: true,
} satisfies Prisma.UsuarioSelect;

export type UsuarioPublico = Prisma.UsuarioGetPayload<{ select: typeof camposPublicos }>;

/** Usuarios con la fecha de su último inicio de sesión. */
export async function dalObtenerUsuarios(): Promise<UsuarioPublico[]> {
  return prisma.usuario.findMany({ select: camposPublicos, orderBy: { fechaRegistro: 'desc' } });
}

export async function dalObtenerUsuarioPorId(id: number): Promise<UsuarioPublico | null> {
  return prisma.usuario.findUnique({ where: { id }, select: camposPublicos });
}

/** Incluye el hash: solo para verificar credenciales en el servidor. */
export async function dalBuscarUsuarioPorCorreo(correo: string): Promise<Usuario | null> {
  return prisma.usuario.findFirst({ where: { correo: { equals: correo, mode: 'insensitive' } } });
}

export async function dalContarAdminsActivos(): Promise<number> {
  return prisma.usuario.count({ where: { tipoUsuario: TipoUsuario.ADMIN, estado: EstadoUsuario.ACTIVO } });
}

export async function dalCrearUsuario(data: Prisma.UsuarioCreateInput): Promise<UsuarioPublico> {
  return prisma.usuario.create({ data, select: camposPublicos });
}

export async function dalActualizarUsuario(id: number, data: Prisma.UsuarioUpdateInput): Promise<UsuarioPublico> {
  return prisma.usuario.update({ where: { id }, data, select: camposPublicos });
}

export async function dalEliminarUsuario(id: number): Promise<void> {
  await prisma.usuario.delete({ where: { id } });
}
