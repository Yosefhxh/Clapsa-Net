'use server';

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/prisma';

type TipoUsuario = 'ADMIN' | 'EDITOR' | 'VIEWER';
type EstadoUsuario = 'ACTIVO' | 'INACTIVO';

export interface UsuarioDTO {
  id: number;
  nombre: string;
  correo: string;
  tipoUsuario: TipoUsuario;
  estado: 'activo' | 'inactivo';
  fechaRegistro: string;
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function mapUsuario(usuario: {
  id: number;
  nombre: string;
  correo: string;
  tipoUsuario: TipoUsuario;
  estado: EstadoUsuario;
  fechaRegistro: Date;
}): UsuarioDTO {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    tipoUsuario: usuario.tipoUsuario,
    estado: usuario.estado === 'ACTIVO' ? 'activo' : 'inactivo',
    fechaRegistro: usuario.fechaRegistro.toISOString(),
  };
}

export async function obtenerUsuarios() {
  const usuarios = await prisma.usuario.findMany({
    orderBy: { id: 'desc' },
  });

  return usuarios.map(mapUsuario);
}

export async function registrarUsuario(datos: {
  nombre: string;
  correo: string;
  tipoUsuario: TipoUsuario;
  estado: 'activo' | 'inactivo';
  password: string;
}) {
  try {
    const usuario = await prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        correo: datos.correo,
        tipoUsuario: datos.tipoUsuario,
        estado: datos.estado === 'activo' ? 'ACTIVO' : 'INACTIVO',
        passwordHash: hashPassword(datos.password),
      },
    });

    revalidatePath('/usuarios');

    return { success: true, usuario: mapUsuario(usuario) };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'El correo ya existe en la base de datos' };
      }

      return { success: false, error: `Error de base de datos (${error.code})` };
    }

    console.error('Error registrarUsuario:', error);
    return { success: false, error: 'Error al registrar usuario' };
  }
}

export async function actualizarUsuario(
  id: number,
  datos: {
    nombre: string;
    correo: string;
    tipoUsuario: TipoUsuario;
    estado: 'activo' | 'inactivo';
    password?: string;
  }
) {
  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        correo: datos.correo,
        tipoUsuario: datos.tipoUsuario,
        estado: datos.estado === 'activo' ? 'ACTIVO' : 'INACTIVO',
        ...(datos.password ? { passwordHash: hashPassword(datos.password) } : {}),
      },
    });

    revalidatePath('/usuarios');

    return { success: true, usuario: mapUsuario(usuario) };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'El correo ya existe en la base de datos' };
      }

      if (error.code === 'P2025') {
        return { success: false, error: 'El usuario ya no existe en la base de datos' };
      }

      return { success: false, error: `Error de base de datos (${error.code})` };
    }

    console.error('Error actualizarUsuario:', error);
    return { success: false, error: 'Error al actualizar usuario' };
  }
}

export async function eliminarUsuario(id: number) {
  try {
    await prisma.usuario.delete({
      where: { id },
    });

    revalidatePath('/usuarios');

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return { success: false, error: 'El usuario ya no existe en la base de datos' };
      }

      return { success: false, error: `Error de base de datos (${error.code})` };
    }

    console.error('Error eliminarUsuario:', error);
    return { success: false, error: 'Error al eliminar usuario' };
  }
}
