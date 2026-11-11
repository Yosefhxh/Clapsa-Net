import 'server-only'

import prisma from '@/shared/lib/prisma'

/** Días antes del vencimiento en que un encargo conferido se avisa (igual que el Home). */
const DIAS_AVISO_ENCARGO = 30

export interface AvisosMenu {
  /** Clientes activos con encargo conferido que vence en los próximos 30 días. */
  encargosPorVencer: number
  /** Operaciones abiertas en reconocimiento o con pedimento validado sin pagar. */
  operacionesUrgentes: number
}

/** Conteos para los puntos de aviso del menú lateral. */
export async function obtenerAvisosMenu(): Promise<AvisosMenu> {
  const ahora = new Date()
  const limite = new Date(ahora.getTime() + DIAS_AVISO_ENCARGO * 86_400_000)
  const [encargosPorVencer, enReconocimiento, porPagar] = await Promise.all([
    prisma.cliente.count({ where: { estado: 'ACTIVO', encargoConferido: true, fechaVigenciaEncargo: { gte: ahora, lte: limite } } }),
    prisma.trafico.count({ where: { cerradaEn: null, pasos: { some: { estado: 'RECONOCIMIENTO', paso: { clave: 'MODULACION' } } } } }),
    prisma.trafico.count({
      where: {
        cerradaEn: null,
        AND: [
          { pasos: { some: { estado: 'COMPLETADO', paso: { clave: 'DESPACHO_ADUANERO' } } } },
          { pasos: { some: { estado: { not: 'COMPLETADO' }, paso: { clave: 'PAGO_CONTRIBUCIONES' } } } },
        ],
      },
    }),
  ])
  return { encargosPorVencer, operacionesUrgentes: enReconocimiento + porPagar }
}
