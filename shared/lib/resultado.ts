import { Prisma } from '@prisma/client'

/** Respuesta estándar de las acciones del servidor. */
export type Resultado<T = undefined> =
  | { ok: true; data: T; mensaje?: string }
  | { ok: false; error: string }

/** Error de negocio con un mensaje que sí se puede mostrar al usuario. */
export class ErrorNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorNegocio'
  }
}

/**
 * Convierte cualquier error en un mensaje claro. Los errores de negocio y de autorización
 * se muestran tal cual; el resto se registra y se responde con un mensaje genérico.
 */
export function mensajeDeError(error: unknown, contexto: string): string {
  if (error instanceof Error && (error.name === 'ErrorNegocio' || error.name === 'ErrorAutorizacion')) {
    return error.message
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return 'Ya existe un registro con esos datos.'
    if (error.code === 'P2025') return 'El registro ya no existe.'
    if (error.code === 'P2003') return 'No se puede completar porque otro registro depende de este.'
  }
  console.error(`[${contexto}]`, error)
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

/** Ejecuta una acción y devuelve un Resultado, sin dejar escapar excepciones al cliente. */
export async function ejecutar<T>(contexto: string, fn: () => Promise<T>, mensaje?: string): Promise<Resultado<T>> {
  try {
    const data = await fn()
    return { ok: true, data, mensaje }
  } catch (error) {
    return { ok: false, error: mensajeDeError(error, contexto) }
  }
}
