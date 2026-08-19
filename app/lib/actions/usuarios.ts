'use server';

import crypto from 'crypto';
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

const PASSWORD_HASH_PREFIX = 'sha256:';
const DEFAULT_SUPERADMIN = {
    nombre: 'Super Admin',
    correo: 'superadmin@clapsa.net',
    password: 'SuperAdmin2026!',
};

function normalizarCorreo(correo: string) {
    return correo.trim().toLowerCase();
}

function hashearPassword(password: string) {
    return `${PASSWORD_HASH_PREFIX}${crypto.createHash('sha256').update(password).digest('hex')}`;
}

function verificarPassword(passwordIngresada: string, passwordPersistida: string) {
    if (!passwordPersistida) {
        return false;
    }

    if (passwordPersistida.startsWith(PASSWORD_HASH_PREFIX)) {
        return passwordPersistida === hashearPassword(passwordIngresada);
    }

    return passwordPersistida === passwordIngresada;
}

function usuarioParaSesion(usuario: {
    id: number;
    nombre: string;
    correo: string;
    tipoUsuario: TipoUsuario;
    estado: EstadoUsuario;
    fechaRegistro: Date;
}) {
    return {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        tipoUsuario: usuario.tipoUsuario,
        estado: usuario.estado,
        fechaRegistro: usuario.fechaRegistro.toISOString(),
    };
}

async function asegurarSuperadmin() {
    const correoSuperadmin = normalizarCorreo(DEFAULT_SUPERADMIN.correo);
    const superadminExistente = await prisma.usuario.findFirst({
        where: {
            correo: {
                equals: correoSuperadmin,
                mode: 'insensitive',
            },
        },
    });

    if (superadminExistente) {
        return superadminExistente;
    }

    return prisma.usuario.create({
        data: {
            nombre: DEFAULT_SUPERADMIN.nombre,
            correo: correoSuperadmin,
            tipoUsuario: TipoUsuario.ADMIN,
            estado: EstadoUsuario.ACTIVO,
            passwordHash: hashearPassword(DEFAULT_SUPERADMIN.password),
        },
    });
}

export async function gestionarUsuario(datos: UsuarioFormData, id?: number) {
    try {
        const passwordHash = datos.password?.trim() ? hashearPassword(datos.password.trim()) : undefined;

        // Acceso seguro al modelo usuario de Prisma
        const dataToSave: Prisma.UsuarioUpdateInput = {
            nombre: datos.nombre,
            correo: normalizarCorreo(datos.correo),
            tipoUsuario: datos.tipoUsuario,
            // Convertimos el string del front ('activo') al valor del Enum (ACTIVO)
            estado: datos.estado.toUpperCase() === 'ACTIVO' ? EstadoUsuario.ACTIVO : EstadoUsuario.INACTIVO,
            ...(passwordHash && { passwordHash })
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
                    correo: normalizarCorreo(datos.correo),
                    tipoUsuario: datos.tipoUsuario,
                    estado: datos.estado.toUpperCase() === 'ACTIVO' ? EstadoUsuario.ACTIVO : EstadoUsuario.INACTIVO,
                    passwordHash: passwordHash ?? '',
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

export async function iniciarSesionAction(correo: string, password: string) {
    try {
        await asegurarSuperadmin();

        const correoNormalizado = normalizarCorreo(correo);

        if (!correoNormalizado) {
            return { success: false, error: 'Usuario incorrecto' };
        }

        const usuario = await prisma.usuario.findFirst({
            where: {
                correo: {
                    equals: correoNormalizado,
                    mode: 'insensitive',
                },
            },
        });

        if (!usuario) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        if (usuario.estado !== EstadoUsuario.ACTIVO) {
            return { success: false, error: 'Usuario incorrecto' };
        }

        if (!verificarPassword(password, usuario.passwordHash)) {
            return { success: false, error: 'Contraseña incorrecta' };
        }

        return {
            success: true,
            usuario: usuarioParaSesion(usuario),
        };
    } catch (error) {
        console.error('Error en iniciarSesionAction:', error);
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