/** Colores de los avatares de empresa: fondo suave y texto del mismo tono. */
const TONOS_AVATAR: [string, string][] = [
  ['#E3E8F7', '#2A48A6'],
  ['#E3F4EE', '#1B7559'],
  ['#FDF3E0', '#8F5A0A'],
  ['#F1ECFB', '#5B45A8'],
  ['#E6F4F8', '#17677D'],
  ['#FCEBE8', '#A33A2C'],
]

/** Iniciales de una razón social, sin contar "S.A.", "de C.V.", artículos ni conectores. */
export function inicialesEmpresa(texto: string): string {
  const limpio = texto
    .replace(/\b(S\.?A\.?|C\.?V\.?|S\.?C\.?|S\.?P\.?R\.?|R\.?L\.?|de|del|la|las|los|y)\b\.?/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const base = limpio[0] || texto.trim()
  return ((base[0] ?? '?') + (limpio[1] ? limpio[1][0] : '')).toUpperCase()
}

/** El mismo texto siempre recibe el mismo color. */
export function tonoAvatar(texto: string): [string, string] {
  const suma = [...texto].reduce((a, c) => a + c.charCodeAt(0), 0)
  return TONOS_AVATAR[suma % TONOS_AVATAR.length]
}
