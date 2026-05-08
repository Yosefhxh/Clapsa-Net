'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/prisma';

type TipoProveedor = 'LOGISTICA' | 'ADUANAL' | 'GENERALES';
type FuenteAltaProveedor = 'MANUAL' | 'CONSTANCIA';

export interface ProveedorDTO {
  id: number;
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  fuente: 'manual' | 'constancia';
  fechaAlta: string;
}

function mapProveedor(proveedor: {
  id: number;
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  fuenteAlta: FuenteAltaProveedor;
  fechaAlta: Date;
}): ProveedorDTO {
  return {
    id: proveedor.id,
    razonSocial: proveedor.razonSocial,
    tipoProveedor: proveedor.tipoProveedor,
    rfc: proveedor.rfc,
    correo: proveedor.correo,
    telefono: proveedor.telefono,
    direccion: proveedor.direccion,
    fuente: proveedor.fuenteAlta === 'CONSTANCIA' ? 'constancia' : 'manual',
    fechaAlta: proveedor.fechaAlta.toISOString(),
  };
}

export async function obtenerProveedores() {
  const proveedores = await prisma.proveedores.findMany({
    orderBy: { id: 'desc' },
  });

  return proveedores.map(mapProveedor);
}

export async function registrarProveedor(datos: {
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  fuenteAlta: FuenteAltaProveedor;
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
        fuenteAlta: datos.fuenteAlta,
      },
    });

    revalidatePath('/proveedores/alta');
    revalidatePath('/proveedores/busqueda');

    return { success: true, proveedor: mapProveedor(proveedor) };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'RFC o correo ya existe en la base de datos' };
      }

      return { success: false, error: `Error de base de datos (${error.code})` };
    }

    console.error('Error registrarProveedor:', error);
    return { success: false, error: 'Error al registrar proveedor' };
  }
}

export async function eliminarProveedor(id: number) {
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
        return { success: false, error: 'El proveedor ya no existe en la base de datos' };
      }

      return { success: false, error: `Error de base de datos (${error.code})` };
    }

    console.error('Error eliminarProveedor:', error);
    return { success: false, error: 'Error al eliminar proveedor' };
  }
}
