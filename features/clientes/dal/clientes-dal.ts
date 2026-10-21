import prisma from '@/shared/lib/prisma';
import { Cliente, FormDataCliente } from '../types/clientes-types';

/**
 * DAL: Consulta clientes ordenados descendentemente.
 */
export async function dalObtenerClientes(tipo?: 'DIRECTO' | 'FORWARDER'): Promise<Cliente[]> {
  return prisma.cliente.findMany({
    where: tipo ? { tipo } : undefined,
    orderBy: { id: 'desc' },
  });
}

/**
 * DAL: Registra un nuevo cliente en base de datos.
 */
export async function dalCrearCliente(datos: {
  folio: string;
  razonSocial: string;
  rfc: string;
  domicilio: string;
  tipo: 'DIRECTO' | 'FORWARDER';
}): Promise<Cliente> {
  return prisma.cliente.create({
    data: {
      folio: datos.folio,
      razonSocial: datos.razonSocial,
      rfc: datos.rfc,
      domicilio: datos.domicilio,
      tipo: datos.tipo,
    },
  });
}

/**
 * DAL: Actualiza un cliente existente por ID.
 */
export async function dalActualizarCliente(
  id: number,
  datos: {
    razonSocial: string;
    rfc: string;
    domicilio: string;
    tipo: 'DIRECTO' | 'FORWARDER';
  }
): Promise<Cliente> {
  return prisma.cliente.update({
    where: { id },
    data: {
      razonSocial: datos.razonSocial,
      rfc: datos.rfc,
      domicilio: datos.domicilio,
      tipo: datos.tipo,
    },
  });
}

/**
 * DAL: Elimina un cliente por ID.
 */
export async function dalEliminarCliente(id: number): Promise<void> {
  await prisma.cliente.delete({
    where: { id },
  });
}

