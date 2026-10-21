import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import prisma from '@/shared/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function compararSecretCron(token: string, cronSecret: string) {
  const tokenBuffer = Buffer.from(token)
  const secretBuffer = Buffer.from(cronSecret)

  if (tokenBuffer.length !== secretBuffer.length) {
    return false
  }

  return timingSafeEqual(tokenBuffer, secretBuffer)
}

function obtenerToken(headers: Headers) {
  const authorization = headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return { valid: false as const, reason: 'CRON_SECRET no está configurado.' }
  }

  if (!authorization) {
    return { valid: false as const, reason: 'Falta el encabezado de autorización.' }
  }

  const bearerPrefix = 'Bearer '
  const token = authorization.startsWith(bearerPrefix)
    ? authorization.slice(bearerPrefix.length).trim()
    : authorization.trim()

  if (!token || !compararSecretCron(token, cronSecret)) {
    return { valid: false as const, reason: 'Token inválido.' }
  }

  return { valid: true as const }
}

export async function GET(request: Request) {
  const tokenValidation = obtenerToken(request.headers)

  if (!tokenValidation.valid) {
    return NextResponse.json(
      {
        success: false,
        message: tokenValidation.reason,
      },
      { status: 401 },
    )
  }

  const now = new Date()
  const fechaLimiteUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  )

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const clientesVencidos = await tx.cliente.findMany({
        where: {
          tipo: 'FORWARDER',
          encargoConferido: true,
          fechaVigenciaEncargo: {
            not: null,
            lte: fechaLimiteUTC,
          },
        },
        select: {
          id: true,
          folio: true,
          razonSocial: true,
          rfc: true,
          fechaVigenciaEncargo: true,
        },
      })

      if (clientesVencidos.length === 0) {
        return {
          updatedCount: 0,
          affectedClients: [] as Array<{
            id: number
            folio: string
            razonSocial: string
            rfc: string
            fechaVigenciaEncargo: Date | null
          }>,
        }
      }

      const ids = clientesVencidos.map((cliente) => cliente.id)

      await tx.cliente.updateMany({
        where: {
          id: {
            in: ids,
          },
        },
        data: {
          encargoConferido: false,
        },
      })

      return {
        updatedCount: ids.length,
        affectedClients: clientesVencidos,
      }
    })

    console.log(
      JSON.stringify(
        {
          event: 'cron.check-encargos.completed',
          timestamp: new Date().toISOString(),
          updatedCount: resultado.updatedCount,
          affectedClients: resultado.affectedClients.map((cliente) => ({
            id: cliente.id,
            folio: cliente.folio,
            razonSocial: cliente.razonSocial,
            rfc: cliente.rfc,
            fechaVigenciaEncargo: cliente.fechaVigenciaEncargo,
          })),
          alert: resultado.updatedCount > 0 ? 'Se simula envío de alerta/correo por encargos vencidos.' : 'Sin acciones requeridas.',
        },
        null,
        2,
      ),
    )

    return NextResponse.json({
      success: true,
      message: 'Proceso de validación de encargos completado.',
      updatedCount: resultado.updatedCount,
    })
  } catch (error) {
    console.error('Error en cron check-encargos:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Ocurrió un error al ejecutar el cron de encargos.',
      },
      { status: 500 },
    )
  }
}
