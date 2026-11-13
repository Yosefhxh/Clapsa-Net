'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/shared/lib/prisma';
import { requerirUsuario } from '@/shared/auth/session';
import { ejecutar, ErrorNegocio, type Resultado } from '@/shared/lib/resultado';
import { WIDGET } from './widgets';
import { PREFERENCIA_SECCIONES, SECCIONES_AVISOS, SECCIONES_GRID, TABLERO_HOME } from './orden';

/** Una permutación exacta de la lista base (mismos elementos, sin repetir). */
const permutacion = (base: readonly string[]) =>
  z.array(z.string()).refine((l) => l.length === base.length && new Set(l).size === l.length && l.every((x) => base.includes(x)), 'Orden no válido.');

const esquema = z.object({
  kpis: permutacion(TABLERO_HOME),
  grid: permutacion(SECCIONES_GRID),
  avisos: permutacion(SECCIONES_AVISOS),
});

/** Guarda el acomodo del Home del usuario actual (solo afecta su propia vista). */
export async function guardarOrdenHomeAction(orden: z.input<typeof esquema>): Promise<Resultado> {
  return ejecutar('guardarOrdenHome', async () => {
    const usuario = await requerirUsuario();
    const r = esquema.safeParse(orden);
    if (!r.success) throw new ErrorNegocio(r.error.issues[0]?.message ?? 'Revisa el orden.');
    const { kpis, grid, avisos } = r.data;

    await prisma.$transaction([
      prisma.widgetUsuario.deleteMany({ where: { usuarioId: usuario.id } }),
      prisma.widgetUsuario.createMany({
        data: kpis.map((widget, orden) => ({ usuarioId: usuario.id, widget, orden, tono: WIDGET(widget)!.tono, umbral: null })),
      }),
      prisma.preferenciaUsuario.upsert({
        where: { usuarioId_clave: { usuarioId: usuario.id, clave: PREFERENCIA_SECCIONES } },
        create: { usuarioId: usuario.id, clave: PREFERENCIA_SECCIONES, valor: { grid, avisos } },
        update: { valor: { grid, avisos } },
      }),
    ]);
    revalidatePath('/');
    return undefined;
  });
}

/** Regresa el Home del usuario actual al acomodo original. */
export async function restablecerOrdenHomeAction(): Promise<Resultado> {
  return ejecutar('restablecerOrdenHome', async () => {
    const usuario = await requerirUsuario();
    await prisma.$transaction([
      prisma.widgetUsuario.deleteMany({ where: { usuarioId: usuario.id } }),
      prisma.preferenciaUsuario.deleteMany({ where: { usuarioId: usuario.id, clave: PREFERENCIA_SECCIONES } }),
    ]);
    revalidatePath('/');
    return undefined;
  });
}
