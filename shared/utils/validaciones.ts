/** RFC de persona moral (12) o física (13). */
export function validarRfc(rfc: string): { valido: boolean; persona: 'MORAL' | 'FISICA' | null } {
  const v = rfc.trim().toUpperCase()
  const valido = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v)
  return { valido, persona: valido ? (v.length === 12 ? 'MORAL' : 'FISICA') : null }
}

/**
 * Número de pedimento: 15 dígitos = año (2) + aduana (2) + patente (4) + consecutivo (7).
 * Devuelve el formato con espacios "26 16 3711 6001850" o null si no es válido.
 */
export function normalizarPedimento(valor: string): string | null {
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length !== 15) return null
  return `${digitos.slice(0, 2)} ${digitos.slice(2, 4)} ${digitos.slice(4, 8)} ${digitos.slice(8)}`
}

const VALOR_LETRA: Record<string, number> = (() => {
  // ISO 6346: A=10 y se saltan los múltiplos de 11.
  const valores: Record<string, number> = {}
  let n = 10
  for (const letra of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (n % 11 === 0) n++
    valores[letra] = n++
  }
  return valores
})()

/**
 * Contenedor ISO 6346: 4 letras + 6 dígitos + dígito verificador.
 * Devuelve "MSKU 482915-3" si es válido o null.
 */
export function normalizarContenedor(valor: string): string | null {
  const v = valor.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z]{3}[UJZ][0-9]{7}$/.test(v)) return null
  const suma = [...v.slice(0, 10)].reduce((acc, c, i) => acc + (/[A-Z]/.test(c) ? VALOR_LETRA[c] : Number(c)) * 2 ** i, 0)
  const verificador = (suma % 11) % 10
  if (verificador !== Number(v[10])) return null
  return `${v.slice(0, 4)} ${v.slice(4, 10)}-${v[10]}`
}
