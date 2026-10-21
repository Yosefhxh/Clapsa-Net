'use server';

import { Prisma } from '@prisma/client';
import { generarSiguienteFolio } from '@/shared/utils/folios';
import { revalidatePath } from 'next/cache';
import {
	dalActualizarCliente,
	dalCrearCliente,
	dalEliminarCliente,
	dalObtenerClientes,
} from '../dal/clientes-dal';

export async function registrarCliente(datos: {
	razonSocial: string;
	rfc: string;
	domicilio: string;
	tipo: 'DIRECTO' | 'FORWARDER';
}) {
	try {
		const nuevoFolio = await generarSiguienteFolio(datos.tipo);

		const cliente = await dalCrearCliente({
			folio: nuevoFolio,
			razonSocial: datos.razonSocial,
			rfc: datos.rfc,
			domicilio: datos.domicilio,
			tipo: datos.tipo,
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

export async function actualizarCliente(
	id: number,
	datos: { razonSocial: string; rfc: string; domicilio: string; tipo: 'DIRECTO' | 'FORWARDER' }
) {
	try {
		const cliente = await dalActualizarCliente(id, datos);

		revalidatePath('/clientes/directo');
		revalidatePath('/clientes/forwarder');

		return { success: true, cliente };
	} catch (error: unknown) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === 'P2002') {
				return { success: false, error: 'RFC o folio ya existe en la base de datos' };
			}

			if (error.code === 'P2025') {
				return { success: false, error: 'El cliente ya no existe en la base de datos' };
			}

			return { success: false, error: `Error de base de datos (${error.code})` };
		}

		console.error('Error actualizarCliente:', error);
		return { success: false, error: 'Error al actualizar cliente' };
	}
}

export async function obtenerClientes(tipo?: 'DIRECTO' | 'FORWARDER') {
	return await dalObtenerClientes(tipo);
}

export async function eliminarCliente(id: number) {
	try {
		await dalEliminarCliente(id);

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
