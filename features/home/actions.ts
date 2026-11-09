'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/shared/lib/prisma';
import { requerirUsuario } from '@/shared/auth/session';
import { ejecutar, ErrorNegocio, type Resultado } from '@/shared/lib/resultado';
import { MAX_WIDGETS, TONOS, WIDGETS, type TonoWidget } from './widgets';

const esquema = z
  .array(
    z.object({
      widget: z.string().refine((id) => WIDGETS.some((w) => w.id === id), 'Widget no válido.'),
      tono: z.string().refine((t): t is TonoWidget => t in TONOS, 'Color no válido.'),
      umbral: z.number().int().min(0).max(100000).nullable(),
    }),
  )
  .max(MAX_WIDGETS, `Elige como máximo ${MAX_WIDGETS} widgets.`);

/** Guarda el tablero del usuario actual (solo afecta su propia vista). */
export async function guardarWidgetsAction(lista: z.input<typeof esquema>): Promise<Resultado> {
  return ejecutar('guardarWidgets', async () => {
    const usuario = await requerirUsuario();
    const r = esquema.safeParse(lista);
    if (!r.success) throw new ErrorNegocio(r.error.issues[0]?.message ?? 'Revisa los widgets.');
    if (new Set(r.data.map((w) => w.widget)).size !== r.data.length) throw new ErrorNegocio('Hay widgets repetidos.');

    await prisma.$transaction([
      prisma.widgetUsuario.deleteMany({ where: { usuarioId: usuario.id } }),
      prisma.widgetUsuario.createMany({
        data: r.data.map((w, orden) => ({ usuarioId: usuario.id, widget: w.widget, tono: w.tono, umbral: w.umbral, orden })),
      }),
    ]);
    revalidatePath('/');
    return undefined;
  }, 'Tablero guardado.');
}

