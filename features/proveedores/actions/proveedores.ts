'use server';

import { revalidatePath } from 'next/cache';
import { FuenteAltaProveedor, TipoProveedor } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/shared/lib/prisma';
import { requerirUsuario } from '@/shared/auth/session';
import { ejecutar, ErrorNegocio, type Resultado } from '@/shared/lib/resultado';
import { validarRfc } from '@/shared/utils/validaciones';

const esquemaProveedor = z.object({
  razonSocial: z.string().trim().min(2, 'La razón social es obligatoria.').max(200),
  tipoProveedor: z.enum(TipoProveedor, { message: 'Elige el tipo de proveedor.' }),
  rfc: z.string().trim().toUpperCase().refine((v) => validarRfc(v).valido, 'El RFC no es válido (12 o 13 caracteres).'),
  correo: z.string().trim().toLowerCase().email('El correo no es válido.'),
  telefono: z.string().trim().regex(/^\+?[\d\s-]{10,16}$/, 'El teléfono debe tener al menos 10 dígitos.'),
  direccion: z.string().trim().min(5, 'La dirección es obligatoria.').max(300),
  fuenteAlta: z.enum(FuenteAltaProveedor).default('MANUAL'),
  aduanas: z.array(z.string().trim().min(1)).max(30).default([]),
  servicios: z
    .array(z.object({ pasoId: z.string().min(1), tarifa: z.number().nonnegative('La tarifa no puede ser negativa.').nullable() }))
    .max(30)
    .default([]),
});

export type DatosProveedor = z.input<typeof esquemaProveedor>;

function validar(datos: unknown) {
  const r = esquemaProveedor.safeParse(datos);
  if (!r.success) throw new ErrorNegocio(r.error.issues[0]?.message ?? 'Revisa los datos del proveedor.');
  if (r.data.tipoProveedor !== 'GENERALES' && r.data.servicios.length === 0) {
    throw new ErrorNegocio('Marca al menos un servicio. Sin servicios no se le podrá asignar a ninguna operación.');
  }
  return r.data;
}

/** Comprueba que los servicios sean pasos de servicio activos y las aduanas existan en el catálogo. */
async function validarCatalogos(datos: ReturnType<typeof validar>) {
  const [pasos, aduanas] = await Promise.all([
    prisma.paso.findMany({ where: { id: { in: datos.servicios.map((s) => s.pasoId) }, esServicio: true, activo: true }, select: { id: true } }),
    prisma.aduana.findMany({ where: { nombre: { in: datos.aduanas } }, select: { nombre: true } }),
  ]);
  if (pasos.length !== new Set(datos.servicios.map((s) => s.pasoId)).size) throw new ErrorNegocio('Uno de los servicios ya no existe.');
  if (aduanas.length !== new Set(datos.aduanas).size) throw new ErrorNegocio('Una de las aduanas ya no existe.');
}

function refrescar() {
  revalidatePath('/proveedores');
}

export async function registrarProveedor(datos: DatosProveedor): Promise<Resultado> {
  return ejecutar('registrarProveedor', async () => {
    await requerirUsuario('catalogos.editar');
    const d = validar(datos);
    await validarCatalogos(d);
    await prisma.proveedores.create({
      data: {
        razonSocial: d.razonSocial,
        tipoProveedor: d.tipoProveedor,
        rfc: d.rfc,
        correo: d.correo,
        telefono: d.telefono,
        direccion: d.direccion,
        fuenteAlta: d.fuenteAlta,
        aduanas: [...new Set(d.aduanas)],
        servicios: { create: d.servicios.map((s) => ({ pasoId: s.pasoId, tarifaBase: s.tarifa })) },
      },
    });
    refrescar();
    return undefined;
  }, 'Proveedor registrado.');
}

export async function actualizarProveedor(id: number, datos: DatosProveedor): Promise<Resultado> {
  return ejecutar('actualizarProveedor', async () => {
    await requerirUsuario('catalogos.editar');
    const d = validar(datos);
    await validarCatalogos(d);
    await prisma.$transaction(async (tx) => {
      // Un servicio que ya está asignado en una operación abierta no se puede quitar.
      const enUso = await tx.traficoPaso.findMany({
        where: { proveedorId: id, trafico: { cerradaEn: null }, pasoId: { notIn: d.servicios.map((s) => s.pasoId) } },
        select: { paso: { select: { nombre: true } } },
        distinct: ['pasoId'],
      });
      if (enUso.length) throw new ErrorNegocio(`No se puede quitar “${enUso[0].paso.nombre}”: está asignado en operaciones abiertas.`);

      await tx.proveedores.update({
        where: { id },
        data: {
          razonSocial: d.razonSocial,
          tipoProveedor: d.tipoProveedor,
          rfc: d.rfc,
          correo: d.correo,
          telefono: d.telefono,
          direccion: d.direccion,
          aduanas: [...new Set(d.aduanas)],
        },
      });
      await tx.proveedorServicio.deleteMany({ where: { proveedorId: id, pasoId: { notIn: d.servicios.map((s) => s.pasoId) } } });
      for (const s of d.servicios) {
        await tx.proveedorServicio.upsert({
          where: { proveedorId_pasoId: { proveedorId: id, pasoId: s.pasoId } },
          update: { tarifaBase: s.tarifa },
          create: { proveedorId: id, pasoId: s.pasoId, tarifaBase: s.tarifa },
        });
      }
    });
    refrescar();
    return undefined;
  }, 'Proveedor actualizado.');
}

export async function eliminarProveedorAction(id: number): Promise<Resultado> {
  return ejecutar('eliminarProveedor', async () => {
    await requerirUsuario('catalogos.eliminar');
    const activos = await prisma.traficoPaso.count({ where: { proveedorId: id, trafico: { cerradaEn: null } } });
    if (activos) throw new ErrorNegocio(`No se puede eliminar: está asignado en ${activos} paso(s) de operaciones abiertas.`);
    await prisma.proveedores.delete({ where: { id } });
    refrescar();
    return undefined;
  }, 'Proveedor eliminado.');
}
