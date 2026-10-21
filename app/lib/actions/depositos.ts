'use server'

import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

const depositoConTraficoArgs = Prisma.validator<Prisma.DepositoDefaultArgs>()({
  include: {
    trafico: {
      select: {
        id: true,
        referenciaAutomatica: true,
      },
    },
  },
})

export type DepositoConTrafico = Prisma.DepositoGetPayload<typeof depositoConTraficoArgs>

export type RegistrarDepositoInput = {
  traficoId: string
  folioDeposito: string
  monto: string | number | Prisma.Decimal
  fechaDeposito: Date | string
  moneda?: string
  banco?: string | null
  referencia?: string | null
  observaciones?: string | null
}

export type RegistrarDepositoResult =
  | {
      success: true
      message: string
      data: DepositoConTrafico
    }
  | {
      success: false
      message: string
      data?: never
    }

const MAX_DEPOSITOS_POR_TRAFICO = 5
const MAX_INTENTOS_TRANSACCION = 3

function normalizarFechaDeposito(fechaDeposito: Date | string) {
  return fechaDeposito instanceof Date ? fechaDeposito : new Date(fechaDeposito)
}

function convertirMonto(monto: string | number | Prisma.Decimal) {
  return monto instanceof Prisma.Decimal ? monto : new Prisma.Decimal(monto)
}

export async function registrarDeposito(
  input: RegistrarDepositoInput,
): Promise<RegistrarDepositoResult> {
  for (let intento = 1; intento <= MAX_INTENTOS_TRANSACCION; intento += 1) {
    try {
      const resultado = await prisma.$transaction(
        async (tx) => {
          const trafico = await tx.trafico.findUnique({
            where: { id: input.traficoId },
            select: { id: true },
          })

          if (!trafico) {
            return {
              success: false,
              message: 'El tráfico no existe.',
            } satisfies RegistrarDepositoResult
          }

          const totalDepositos = await tx.deposito.count({
            where: { traficoId: input.traficoId },
          })

          if (totalDepositos >= MAX_DEPOSITOS_POR_TRAFICO) {
            return {
              success: false,
              message: 'No se puede registrar el depósito. El tráfico ya alcanzó el máximo de 5 depósitos.',
            } satisfies RegistrarDepositoResult
          }

          const depositoCreado = await tx.deposito.create({
            data: {
              traficoId: input.traficoId,
              folioDeposito: input.folioDeposito.trim(),
              monto: convertirMonto(input.monto),
              fechaDeposito: normalizarFechaDeposito(input.fechaDeposito),
              moneda: input.moneda?.trim() || 'MXN',
              banco: input.banco?.trim() || null,
              referencia: input.referencia?.trim() || null,
              observaciones: input.observaciones?.trim() || null,
            },
            include: depositoConTraficoArgs.include,
          })

          return {
            success: true,
            message: 'Depósito registrado correctamente.',
            data: depositoCreado,
          } satisfies RegistrarDepositoResult
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      )

      return resultado
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        if (intento < MAX_INTENTOS_TRANSACCION) {
          continue
        }

        return {
          success: false,
          message: 'No se pudo registrar el depósito por concurrencia. Intenta nuevamente.',
        }
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return {
            success: false,
            message: 'Ya existe un depósito con ese folio.',
          }
        }

        return {
          success: false,
          message: `Error de base de datos (${error.code}).`,
        }
      }

      console.error('Error en registrarDeposito:', error)
      return {
        success: false,
        message: 'Ocurrió un error inesperado al registrar el depósito.',
      }
    }
  }
}
