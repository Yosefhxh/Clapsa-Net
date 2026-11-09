import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

const PREFIJO_SCRYPT = 'scrypt:'
const PREFIJO_SHA256_ANTIGUO = 'sha256:'
const LONGITUD_CLAVE = 64

/** Genera `scrypt:<sal>:<hash>` en hexadecimal. */
export async function hashearPassword(password: string): Promise<string> {
  const sal = randomBytes(16)
  const hash = await scrypt(password, sal, LONGITUD_CLAVE)
  return `${PREFIJO_SCRYPT}${sal.toString('hex')}:${hash.toString('hex')}`
}

function igualesSeguro(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Verifica la contraseña. Acepta los formatos anteriores (SHA-256 sin sal y texto plano)
 * para no dejar fuera a nadie; en ese caso `requiereActualizar` indica que hay que re-hashear.
 */
export async function verificarPassword(
  password: string,
  guardado: string,
): Promise<{ valida: boolean; requiereActualizar: boolean }> {
  if (!guardado) return { valida: false, requiereActualizar: false }

  if (guardado.startsWith(PREFIJO_SCRYPT)) {
    const [salHex, hashHex] = guardado.slice(PREFIJO_SCRYPT.length).split(':')
    if (!salHex || !hashHex) return { valida: false, requiereActualizar: false }
    const esperado = Buffer.from(hashHex, 'hex')
    const calculado = await scrypt(password, Buffer.from(salHex, 'hex'), esperado.length)
    return { valida: igualesSeguro(calculado, esperado), requiereActualizar: false }
  }

  if (guardado.startsWith(PREFIJO_SHA256_ANTIGUO)) {
    const calculado = Buffer.from(createHash('sha256').update(password).digest('hex'))
    const esperado = Buffer.from(guardado.slice(PREFIJO_SHA256_ANTIGUO.length))
    const valida = igualesSeguro(calculado, esperado)
    return { valida, requiereActualizar: valida }
  }

  const valida = igualesSeguro(Buffer.from(password), Buffer.from(guardado))
  return { valida, requiereActualizar: valida }
}

/** Reglas mínimas para contraseñas nuevas. Devuelve el mensaje de error o null. */
export function validarPasswordNueva(password: string): string | null {
  if (password.length < 10) return 'La contraseña debe tener al menos 10 caracteres.'
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe incluir mayúscula, minúscula y número.'
  }
  return null
}
