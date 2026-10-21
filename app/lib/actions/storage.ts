'use server'

import { put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'

export type UploadDocumentResult =
  | {
      success: true
      message: string
      url: string
      pathname: string
      contentType: string
    }
  | {
      success: false
      message: string
      url?: never
      pathname?: never
      contentType?: never
    }

function normalizarSlug(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function validarPdf(file: File) {
  const nombre = file.name.toLowerCase()
  const mimeValido = file.type === 'application/pdf'
  const extensionValida = nombre.endsWith('.pdf')

  return mimeValido || extensionValida
}

export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  try {
    const fileEntry = formData.get('file')
    const rawFolder = formData.get('folder')
    const rawPrefix = formData.get('prefix')

    if (!(fileEntry instanceof File)) {
      return {
        success: false,
        message: 'Debes enviar un archivo válido en el campo file.',
      }
    }

    if (fileEntry.size === 0) {
      return {
        success: false,
        message: 'El archivo está vacío.',
      }
    }

    if (!validarPdf(fileEntry)) {
      return {
        success: false,
        message: 'Solo se permiten documentos PDF.',
      }
    }

    const folder = typeof rawFolder === 'string' && rawFolder.trim() ? normalizarSlug(rawFolder) : 'documentos'
    const prefix = typeof rawPrefix === 'string' && rawPrefix.trim() ? normalizarSlug(rawPrefix) : 'archivo'
    const safeName = fileEntry.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
    const pathname = `${folder}/${prefix}-${randomUUID()}-${safeName}`

    const blob = await put(pathname, fileEntry, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: fileEntry.type || 'application/pdf',
    })

    return {
      success: true,
      message: 'Archivo subido correctamente.',
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    }
  } catch (error) {
    console.error('Error en uploadDocument:', error)
    return {
      success: false,
      message: 'Ocurrió un error al subir el documento.',
    }
  }
}
