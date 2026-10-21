import prisma from '@/shared/lib/prisma';
import { Proveedores, TipoProveedor } from '@prisma/client';

/**
 * DAL: Obtiene todos los proveedores ordenados por id descendente.
 */
export async function dalObtenerProveedores(): Promise<Proveedores[]> {
  return prisma.proveedores.findMany({
    orderBy: { id: 'desc' },
  });
}

/**
 * DAL: Crea un nuevo proveedor en base de datos.
 */
export async function dalCrearProveedor(datos: {
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
}): Promise<Proveedores> {
  return prisma.proveedores.create({
    data: {
      razonSocial: datos.razonSocial,
      tipoProveedor: datos.tipoProveedor,
      rfc: datos.rfc,
      correo: datos.correo,
      telefono: datos.telefono,
      direccion: datos.direccion,
    },
  });
}

/**
 * DAL: Elimina un proveedor por su ID.
 */
export async function dalEliminarProveedor(id: number): Promise<void> {
  await prisma.proveedores.delete({
    where: { id },
  });
}

