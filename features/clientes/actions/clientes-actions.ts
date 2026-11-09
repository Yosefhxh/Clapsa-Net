'use server';

import { revalidatePath } from 'next/cache';
import { TipoCliente } from '@prisma/client';
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
    const padre = await prisma.cliente.findUnique({ where: { id: d.clientePadreId }, select: { tipo: true } });
    if (!padre || padre.tipo !== 'FORWARDER') throw new ErrorNegocio('El forwarder elegido ya no existe.');
  }
  if (id && d.clientePadreId === id) throw new ErrorNegocio('Un cliente no puede depender de sí mismo.');
  return d;
}

function refrescar() {
  revalidatePath('/clientes/directo');
  revalidatePath('/clientes/forwarder');
  revalidatePath('/operaciones');
}

export async function registrarCliente(datos: DatosCliente): Promise<Resultado<{ id: number; folio: string }>> {
  return ejecutar('registrarCliente', async () => {
    await requerirUsuario('catalogos.editar');
    const d = await validar(datos);
    const folio = await generarSiguienteFolio(d.tipo);
    const cliente = await prisma.cliente.create({ data: { ...d, folio } });
    refrescar();
    return { id: cliente.id, folio };
  });
}

export async function actualizarCliente(id: number, datos: DatosCliente): Promise<Resultado> {
  return ejecutar('actualizarCliente', async () => {
    await requerirUsuario('catalogos.editar');
    const d = await validar(datos, id);
    const actual = await prisma.cliente.findUnique({ where: { id }, select: { tipo: true } });
    if (!actual) throw new ErrorNegocio('El cliente ya no existe.');
    // El tipo define el folio (CLPD / CLPF): no se cambia al editar.
    await prisma.cliente.update({ where: { id }, data: { ...d, tipo: actual.tipo } });
    refrescar();
    return undefined;
  }, 'Cliente actualizado.');
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
