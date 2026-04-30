'use server';

import prisma from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { generarSiguienteFolio } from '../utils/folios';
import { revalidatePath } from 'next/cache';

export async function registrarCliente(datos: { razonSocial: string; rfc: string; tipo: 'DIRECTO' | 'FORWARDER' }) {
	try {
		const nuevoFolio = await generarSiguienteFolio(datos.tipo);

		const cliente = await prisma.cliente.create({
			data: {
				folio: nuevoFolio,
				razonSocial: datos.razonSocial,
				rfc: datos.rfc,
				tipo: datos.tipo,
			},
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

export async function obtenerClientes(tipo?: 'DIRECTO' | 'FORWARDER') {
	return prisma.cliente.findMany({
		where: tipo ? { tipo } : undefined,
		orderBy: { id: 'desc' },
	});
}

export async function eliminarCliente(id: number) {
	try {
		await prisma.cliente.delete({
			where: { id },
		});

		revalidatePath('/clientes/directo');
		revalidatePath('/clientes/forwarder');

		return { success: true };
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2025') {
				return { success: false, error: 'El cliente ya no existe en la base de datos' };
			}

			return { success: false, error: `Error de base de datos (${error.code})` };
		}

		console.error('Error eliminarCliente:', error);
		return { success: false, error: 'Error al eliminar cliente' };
	}
}