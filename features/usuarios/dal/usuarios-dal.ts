import prisma from '@/shared/lib/prisma';
import { Prisma, Usuario } from '@prisma/client';

/**
 * DAL: Obtiene todos los usuarios ordenados por fecha de registro descendente.
 */
export async function dalObtenerUsuarios(): Promise<Usuario[]> {
  return prisma.usuario.findMany({
    orderBy: { fechaRegistro: 'desc' },
  });
}

/**
 * DAL: Busca un usuario por correo electrónico (case-insensitive).
 */
export async function dalBuscarUsuarioPorCorreo(correo: string): Promise<Usuario | null> {
  return prisma.usuario.findFirst({
    where: {
      correo: {
        equals: correo,
        mode: 'insensitive',
      },
    },
  });
}

/**
 * DAL: Crea un nuevo registro de usuario en la base de datos.
 */
export async function dalCrearUsuario(data: Prisma.UsuarioCreateInput): Promise<Usuario> {
  return prisma.usuario.create({
    data,
  });
}

/**
 * DAL: Actualiza un registro existente de usuario.
 */
export async function dalActualizarUsuario(id: number, data: Prisma.UsuarioUpdateInput): Promise<Usuario> {
  return prisma.usuario.update({
    where: { id },
    data,
  });
}

/**
 * DAL: Elimina un usuario por su identificador único.
 */
export async function dalEliminarUsuario(id: number): Promise<void> {
  await prisma.usuario.delete({
    where: { id },
  });
}

