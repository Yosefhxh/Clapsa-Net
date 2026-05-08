'use server';

import prisma from '@/app/lib/prisma';
import { Prisma, TipoProveedor } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function registrarProveedor(datos: {
    razonSocial: string;
    tipoProveedor: TipoProveedor;
    rfc: string;
    correo: string;
    telefono: string;
    direccion: string;
}) {
    try {
        const proveedor = await prisma.proveedores.create({
            data: {
                razonSocial: datos.razonSocial,
                tipoProveedor: datos.tipoProveedor,
                rfc: datos.rfc,
                correo: datos.correo,
                telefono: datos.telefono,
                direccion: datos.direccion,
            },
        });

        // Revalidamos las rutas donde se muestran proveedores
        revalidatePath('/proveedores/alta');
        revalidatePath('/proveedores/busqueda');

        return { success: true, proveedor };
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Error P2002: Violación de restricción única (RFC o Correo ya existen)
            if (error.code === 'P2002') {
                const target = (error.meta?.target as string[]) || [];
                const campo = target.includes('rfc') ? 'RFC' : 'Correo';
                return { success: false, error: `El ${campo} ya existe en la base de datos` };
            }
            return { success: false, error: `Error de base de datos (${error.code})` };
        }

        console.error('Error registrarProveedor:', error);
        return { success: false, error: 'Error al registrar el proveedor' };
    }
}

export async function obtenerProveedores() {
    try {
        return await prisma.proveedores.findMany({
            orderBy: { id: 'desc' },
        });
    } catch (error) {
        console.error('Error obtenerProveedores:', error);
        return [];
    }
}

export async function eliminarProveedorAction(id: number) {
    try {
        await prisma.proveedores.delete({
            where: { id },
        });

        revalidatePath('/proveedores/alta');
        revalidatePath('/proveedores/busqueda');

        return { success: true };
    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return { success: false, error: 'El proveedor ya no existe' };
            }
            return { success: false, error: `Error de base de datos (${error.code})` };
        }
        return { success: false, error: 'Error al eliminar proveedor' };
    }
}