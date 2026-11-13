import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { ErrorNegocio } from './resultado'

export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024

const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Valida que sea un PDF de hasta 5 MB. Lanza ErrorNegocio con un mensaje claro. */
export function validarPdf(archivo: unknown): File {
  if (!(archivo instanceof File) || archivo.size === 0) throw new ErrorNegocio('Selecciona un archivo PDF.')
  const esPdf = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf')
  if (!esPdf) throw new ErrorNegocio('Solo se permiten archivos PDF.')
  if (archivo.size > TAMANO_MAXIMO_BYTES) throw new ErrorNegocio('El archivo pesa más de 5 MB.')
  return archivo
}

/**
 * Guarda el archivo y devuelve su URL. Usa Vercel Blob cuando hay token; en desarrollo,
 * sin token, lo guarda en public/uploads para poder probar sin tocar el almacenamiento real.
 */
export async function guardarArchivo(archivo: File, carpeta: string, prefijo: string): Promise<string> {
  const nombre = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  const ruta = `${slug(carpeta)}/${slug(prefijo)}-${randomUUID()}-${nombre}`
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (token) {
    const blob = await put(ruta, archivo, { access: 'public', token, contentType: archivo.type || 'application/pdf' })
    return blob.url
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('BLOB_READ_WRITE_TOKEN no está configurado.')
  }

  const destino = path.join(process.cwd(), 'public', 'uploads', ruta)
  await mkdir(path.dirname(destino), { recursive: true })
  await writeFile(destino, Buffer.from(await archivo.arrayBuffer()))
  return `/uploads/${ruta}`
}
