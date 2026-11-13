import 'server-only'

import { Prisma } from '@prisma/client'
import prisma from '@/shared/lib/prisma'

type Cliente = Prisma.TransactionClient | typeof prisma

/** Prefijos de folio. Clientes: CLPD directo, CLPF forwarder. Operaciones: CLPT (tráfico). */
export const PREFIJO_FOLIO = {
  DIRECTO: 'CLPD',
  FORWARDER: 'CLPF',
  OPERACION: 'CLPT',
} as const

type Prefijo = (typeof PREFIJO_FOLIO)[keyof typeof PREFIJO_FOLIO]

/** Mayor consecutivo ya usado con ese prefijo y año (para arrancar el contador sin repetir). */
async function maximoExistente(db: Cliente, prefijo: Prefijo, anio2: string): Promise<number> {
  const patron = `${prefijo}-${anio2}-%`
  const filas =
    prefijo === PREFIJO_FOLIO.OPERACION
      ? await db.$queryRaw<{ n: number | null }[]>`
          SELECT MAX(CAST(SPLIT_PART("referenciaAutomatica", '-', 3) AS INTEGER)) AS n
          FROM "Trafico" WHERE "referenciaAutomatica" LIKE ${patron}`
      : await db.$queryRaw<{ n: number | null }[]>`
          SELECT MAX(CAST(SPLIT_PART("folio", '-', 3) AS INTEGER)) AS n
          FROM "Cliente" WHERE "folio" LIKE ${patron}`
  return Number(filas[0]?.n ?? 0)
}

/**
 * Devuelve el siguiente folio `PREFIJO-AA-#####`. El incremento es atómico en la BD,
 * así que dos registros simultáneos nunca reciben el mismo número.
 */
export async function generarFolio(prefijo: Prefijo, db: Cliente = prisma): Promise<string> {
  const anio = new Date().getFullYear()
  const anio2 = String(anio % 100).padStart(2, '0')
  const semilla = await maximoExistente(db, prefijo, anio2)

  const [fila] = await db.$queryRaw<{ ultimo: number }[]>`
    INSERT INTO "Consecutivo" ("prefijo", "anio", "ultimo") VALUES (${prefijo}, ${anio}, ${semilla + 1})
    ON CONFLICT ("prefijo", "anio") DO UPDATE SET "ultimo" = GREATEST("Consecutivo"."ultimo", ${semilla}) + 1
    RETURNING "ultimo"`

  return `${prefijo}-${anio2}-${String(fila.ultimo).padStart(5, '0')}`
}

/**
 * Folio que recibiría el siguiente registro, sin apartarlo (solo para mostrarlo en pantalla).
 * El folio definitivo se asigna al guardar y puede cambiar si otra persona guarda antes.
 */
export async function verSiguienteFolio(prefijo: Prefijo, db: Cliente = prisma): Promise<string> {
  const anio = new Date().getFullYear()
  const anio2 = String(anio % 100).padStart(2, '0')
  const [existente, consecutivo] = await Promise.all([
    maximoExistente(db, prefijo, anio2),
    db.consecutivo.findUnique({ where: { prefijo_anio: { prefijo, anio } }, select: { ultimo: true } }),
  ])
  const siguiente = Math.max(existente, consecutivo?.ultimo ?? 0) + 1
  return `${prefijo}-${anio2}-${String(siguiente).padStart(5, '0')}`
}

export async function generarSiguienteFolio(tipo: 'DIRECTO' | 'FORWARDER') {
  return generarFolio(PREFIJO_FOLIO[tipo])
}
