'use server';

import { revalidatePath } from 'next/cache';
import { EstadoCatalogo, TipoCliente } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/shared/lib/prisma';
import { requerirUsuario } from '@/shared/auth/session';
import { guardarArchivo, validarPdf } from '@/shared/lib/almacenamiento';
import { ejecutar, ErrorNegocio, type Resultado } from '@/shared/lib/resultado';
import { generarSiguienteFolio } from '@/shared/utils/folios';
import { validarRfc } from '@/shared/utils/validaciones';

const esquemaCliente = z.object({
  razonSocial: z.string().trim().min(2, 'La razón social es obligatoria.').max(200),
  rfc: z.string().trim().toUpperCase().refine((v) => validarRfc(v).valido, 'El RFC no es válido (12 o 13 caracteres).'),
  domicilio: z.string().trim().max(300).transform((v) => v || 'No especificado'),
  tipo: z.enum(TipoCliente),
  padronImportadores: z.boolean().nullable(),
  encargoConferido: z.boolean(),
  fechaVigenciaEncargo: z
    .string()
    .nullable()
    .transform((v, ctx) => {
      if (!v) return null;
      const d = new Date(`${v}T23:59:59`);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: 'custom', message: 'La fecha de vigencia no es válida.' });
        return z.NEVER;
      }
      return d;
    }),
  clientePadreId: z.number().int().positive().nullable(),
});

export type DatosCliente = z.input<typeof esquemaCliente>;

async function validar(datos: unknown, id?: number) {
  const r = esquemaCliente.safeParse(datos);
  if (!r.success) throw new ErrorNegocio(r.error.issues[0]?.message ?? 'Revisa los datos del cliente.');
  const d = r.data;
  if (d.tipo === 'FORWARDER' && d.clientePadreId) throw new ErrorNegocio('Un forwarder no puede depender de otro forwarder.');
  if (d.clientePadreId) {
    const padre = await prisma.cliente.findUnique({ where: { id: d.clientePadreId }, select: { tipo: true, estado: true } });
    if (!padre || padre.tipo !== 'FORWARDER') throw new ErrorNegocio('El forwarder elegido ya no existe.');
    const actual = id ? await prisma.cliente.findUnique({ where: { id }, select: { clientePadreId: true } }) : null;
    if (padre.estado === 'INACTIVO' && actual?.clientePadreId !== d.clientePadreId) throw new ErrorNegocio('El forwarder elegido está inactivo.');
  }
  if (id && d.clientePadreId === id) throw new ErrorNegocio('Un cliente no puede depender de sí mismo.');
  return d;
}

function refrescar() {
  revalidatePath('/clientes/directo');
  revalidatePath('/clientes/forwarder');
  revalidatePath('/operaciones');
}

/** Valida la constancia (si viene) antes de tocar la base de datos. */
const constanciaDe = (archivo?: FormData | null) => {
  const f = archivo?.get('constancia');
  return f ? validarPdf(f) : null;
};

/** Registra un cliente; si se cargó la constancia de situación fiscal, se guarda para poder consultarla. */
export async function registrarCliente(datos: DatosCliente, archivo?: FormData | null): Promise<Resultado<{ id: number; folio: string }>> {
  return ejecutar('registrarCliente', async () => {
    await requerirUsuario('catalogos.editar');
    const d = await validar(datos);
    const pdf = constanciaDe(archivo);
    const existe = await prisma.cliente.findUnique({ where: { rfc: d.rfc }, select: { folio: true } });
    if (existe) throw new ErrorNegocio(`Ya existe un cliente con el RFC ${d.rfc} (${existe.folio}).`);
    const folio = await generarSiguienteFolio(d.tipo);
    const pdfConstanciaUrl = pdf ? await guardarArchivo(pdf, `clientes/${folio}`, 'constancia-fiscal') : null;
    const cliente = await prisma.cliente.create({ data: { ...d, folio, pdfConstanciaUrl } });
    refrescar();
    return { id: cliente.id, folio };
  });
}

export async function actualizarCliente(id: number, datos: DatosCliente, archivo?: FormData | null): Promise<Resultado> {
  return ejecutar('actualizarCliente', async () => {
    await requerirUsuario('catalogos.editar');
    const d = await validar(datos, id);
    const pdf = constanciaDe(archivo);
    const actual = await prisma.cliente.findUnique({ where: { id }, select: { tipo: true, folio: true } });
    if (!actual) throw new ErrorNegocio('El cliente ya no existe.');
    const otro = await prisma.cliente.findFirst({ where: { rfc: d.rfc, NOT: { id } }, select: { folio: true } });
    if (otro) throw new ErrorNegocio(`Ya existe otro cliente con el RFC ${d.rfc} (${otro.folio}).`);
    const pdfConstanciaUrl = pdf ? await guardarArchivo(pdf, `clientes/${actual.folio}`, 'constancia-fiscal') : undefined;
    // El tipo define el folio (CLPD / CLPF): no se cambia al editar.
    await prisma.cliente.update({ where: { id }, data: { ...d, tipo: actual.tipo, ...(pdfConstanciaUrl ? { pdfConstanciaUrl } : {}) } });
    refrescar();
    return undefined;
  }, `Cambios guardados.`);
}

/**
 * Marca clientes como inactivos (dar de baja) o los reactiva. Un cliente inactivo ya no aparece
 * al crear operaciones; su historial y sus operaciones se conservan.
 */
export async function cambiarEstadoClientes(ids: number[], estado: EstadoCatalogo): Promise<Resultado<{ cambiados: number }>> {
  return ejecutar('cambiarEstadoClientes', async () => {
    await requerirUsuario('catalogos.eliminar');
    const lista = z.array(z.number().int().positive()).min(1, 'Elige al menos un cliente.').max(500).safeParse(ids);
    if (!lista.success) throw new ErrorNegocio(lista.error.issues[0]?.message ?? 'Elige al menos un cliente.');
    if (!Object.values(EstadoCatalogo).includes(estado)) throw new ErrorNegocio('Estado no válido.');
    const r = await prisma.cliente.updateMany({ where: { id: { in: lista.data }, estado: { not: estado } }, data: { estado } });
    refrescar();
    return { cambiados: r.count };
  });
}

export async function eliminarCliente(id: number): Promise<Resultado> {
  return ejecutar('eliminarCliente', async () => {
    await requerirUsuario('catalogos.eliminar');
    const usos = await prisma.trafico.count({ where: { OR: [{ clienteId: id }, { importadorId: id }] } });
    if (usos) throw new ErrorNegocio(`No se puede eliminar: el cliente tiene ${usos} operación(es) registradas.`);
    await prisma.cliente.delete({ where: { id } });
    refrescar();
    return undefined;
  }, 'Cliente eliminado.');
}

/** Guarda el PDF del encargo conferido del cliente. */
export async function subirEncargoAction(id: number, formData: FormData): Promise<Resultado> {
  return ejecutar('subirEncargo', async () => {
    await requerirUsuario('catalogos.editar');
    const pdf = validarPdf(formData.get('file'));
    const cliente = await prisma.cliente.findUnique({ where: { id }, select: { folio: true } });
    if (!cliente) throw new ErrorNegocio('El cliente ya no existe.');
    const url = await guardarArchivo(pdf, `clientes/${cliente.folio}`, 'encargo-conferido');
    await prisma.cliente.update({ where: { id }, data: { pdfEncargoUrl: url } });
    refrescar();
    return undefined;
  }, 'Encargo conferido guardado.');
}
