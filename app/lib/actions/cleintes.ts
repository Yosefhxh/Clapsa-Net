'use server';

import prisma from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { generarSiguienteFolio } from '../utils/folios';
import { revalidatePath } from 'next/cache';

export async function registrarCliente(datos: { razonSocial: string, rfc: string, tipo: 'DIRECTO' | 'FORWARDER' }) {
  try {
    const nuevoFolio = await generarSiguienteFolio(datos.tipo);

    const cliente = await prisma.cliente.create({
      data: {
        folio: nuevoFolio,
        razonSocial: datos.razonSocial,
        rfc: datos.rfc,
        tipo: datos.tipo
      }
    });

    revalidatePath('/clientes/directo');
    revalidatePath('/clientes/forwarder');
    
    return { success: true, cliente };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { success: false, error: 'RFC o folio ya existe en la base de datos' };
      }

      return { success: false, error: `Error de base de datos (${error.code})` };
    }

    console.error('Error registrarCliente:', error);
    return { success: false, error: 'Error al registrar cliente' };
  }
}