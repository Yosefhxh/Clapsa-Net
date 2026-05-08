'use server';

import prisma from '@/app/lib/prisma';
import { Prisma, TipoUsuario, EstadoUsuario } from '@prisma/client';
import { revalidatePath } from 'next/cache';

interface UsuarioFormData {
  nombre: string;
  correo: string;
  tipoUsuario: TipoUsuario;
  estado: 'activo' | 'inactivo';
  password?: string;
}

export async function gestionarUsuario(datos: UsuarioFormData, id?: number) {
    try {
        // Acceso seguro al modelo usuario de Prisma
        const dataToSave: Prisma.UsuarioUpdateInput = {
            nombre: datos.nombre,
            correo: datos.correo,
            tipoUsuario: datos.tipoUsuario,
            // Convertimos el string del front ('activo') al valor del Enum (ACTIVO)
            estado: datos.estado.toUpperCase() === 'ACTIVO' ? EstadoUsuario.ACTIVO : EstadoUsuario.INACTIVO,
            ...(datos.password && { passwordHash: datos.password }) // Usamos passwordHash según tu esquema
        };

        if (id) {
            await prisma.usuario.update({
                where: { id: Number(id) },
                data: dataToSave,
            });
        } else {
            await prisma.usuario.create({
                data: {
                    nombre: datos.nombre,
                    correo: datos.correo,
                    tipoUsuario: datos.tipoUsuario,
                    estado: datos.estado.toUpperCase() === 'ACTIVO' ? EstadoUsuario.ACTIVO : EstadoUsuario.INACTIVO,
                    passwordHash: datos.password || '',
                },
            });
        }

        revalidatePath('/usuarios');
        return { success: true };

    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return { success: false, error: 'El correo electrónico ya está registrado' };
            }
            return { success: false, error: `Error de base de datos (${error.code})` };
        }
        
        console.error('Error en gestionarUsuario:', error);
        return { success: false, error: 'Ocurrió un error inesperado' };
    }
}

export async function obtenerUsuarios() {
    try {
        const usuarios = await prisma.usuario.findMany({
            orderBy: { fechaRegistro: 'desc' },
        });
        
        return usuarios;
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        return [];
    }
}

export async function eliminarUsuarioAction(id: number) {
    try {
        await prisma.usuario.delete({
            where: { id: Number(id) },
        });

        revalidatePath('/usuarios');
        return { success: true };

    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return { success: false, error: 'El usuario ya no existe' };
            }
            return { success: false, error: `Error de base de datos (${error.code})` };
        }
        return { success: false, error: 'Error al eliminar el usuario' };
    }
}