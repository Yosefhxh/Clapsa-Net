'use server'

import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

const traficoPasoConPasoArgs = Prisma.validator<Prisma.TraficoPasoDefaultArgs>()({
  include: {
    paso: true,
  },
})

export type TraficoPasoConPaso = Prisma.TraficoPasoGetPayload<typeof traficoPasoConPasoArgs>

export type TimerAction = 'start' | 'stop'

export type GestionarTimerInput = {
  traficoId: string
  pasoId: string
  action: TimerAction
}

export type GestionarTimerResult =
  | {
      success: true
      message: string
      data: TraficoPasoConPaso
      duration?: {
        seconds: number
        hours: number
        days: number
      }
    }
  | {
      success: false
      message: string
      data?: never
      duration?: never
    }

const MAX_INTENTOS_TRANSACCION = 3

function calcularDuracion(inicio: Date, fin: Date) {
  const diferenciaMs = Math.max(0, fin.getTime() - inicio.getTime())
  const seconds = Math.floor(diferenciaMs / 1000)
  const hours = seconds / 3600
  const days = hours / 24

  return { seconds, hours, days }
}

async function ejecutarGestionTimer(
  input: GestionarTimerInput,
): Promise<GestionarTimerResult> {
  return prisma.$transaction(
    async (tx) => {
      const relacionExistente = await tx.traficoPaso.findUnique({
        where: {
          traficoId_pasoId: {
            traficoId: input.traficoId,
            pasoId: input.pasoId,
          },
        },
        include: traficoPasoConPasoArgs.include,
      })

      if (input.action === 'start') {
        const inicio = new Date()

        const timerIniciado = relacionExistente
          ? await tx.traficoPaso.update({
              where: {
                traficoId_pasoId: {
                  traficoId: input.traficoId,
                  pasoId: input.pasoId,
                },
              },
              data: {
                fechaInicio: inicio,
                fechaFin: null,
                tiempoInvertido: null,
              },
              include: traficoPasoConPasoArgs.include,
            })
          : await tx.traficoPaso.create({
              data: {
                traficoId: input.traficoId,
                pasoId: input.pasoId,
                fechaInicio: inicio,
                fechaFin: null,
                tiempoInvertido: null,
              },
              include: traficoPasoConPasoArgs.include,
            })

        return {
          success: true,
          message: 'Temporizador iniciado correctamente.',
          data: timerIniciado,
        }
      }

      if (!relacionExistente) {
        return {
          success: false,
          message: 'No existe un registro de tiempo para detener en este tráfico y paso.',
        }
      }

      if (!relacionExistente.fechaInicio) {
        return {
          success: false,
          message: 'No se puede detener un temporizador sin fecha de inicio.',
        }
      }

      const fin = new Date()
      const duration = calcularDuracion(relacionExistente.fechaInicio, fin)

      const timerDetenido = await tx.traficoPaso.update({
        where: {
          traficoId_pasoId: {
            traficoId: input.traficoId,
            pasoId: input.pasoId,
          },
        },
        data: {
          fechaFin: fin,
          tiempoInvertido: duration.seconds,
        },
        include: traficoPasoConPasoArgs.include,
      })

      return {
        success: true,
        message: 'Temporizador detenido correctamente.',
        data: timerDetenido,
        duration,
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  )
}

export async function gestionarTimerTraficoPaso(
  input: GestionarTimerInput,
): Promise<GestionarTimerResult> {
  for (let intento = 1; intento <= MAX_INTENTOS_TRANSACCION; intento += 1) {
    try {
      return await ejecutarGestionTimer(input)
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        if (intento < MAX_INTENTOS_TRANSACCION) {
          continue
        }

        return {
          success: false,
          message: 'No se pudo actualizar el temporizador por concurrencia. Intenta nuevamente.',
        }
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return {
            success: false,
            message: 'Ya existe un registro de tiempo para ese tráfico y paso.',
          }
        }

        return {
          success: false,
          message: `Error de base de datos (${error.code}).`,
        }
      }

      console.error('Error en gestionarTimerTraficoPaso:', error)
      return {
        success: false,
        message: 'Ocurrió un error inesperado al actualizar el temporizador.',
      }
    }
  }

  return {
    success: false,
    message: 'No se pudo completar la operación.',
  }
}
