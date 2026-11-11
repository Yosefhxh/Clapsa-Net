/** Orden del Home: widgets, columnas (tabla y avisos) y tarjetas de la columna de avisos. */

/** Los 6 widgets del Home, en el orden original. */
export const TABLERO_HOME = ['por_despachar', 'reconocimiento', 'por_pagar', 'trafico_activo', 'proximo_llegar', 'desaduanadas'] as const;
export const SECCIONES_GRID = ['tabla', 'avisos'] as const;
export const SECCIONES_AVISOS = ['arribos', 'pendientes'] as const;

export type GrupoOrden = 'kpis' | 'grid' | 'avisos';
export interface OrdenHome {
  kpis: string[];
  grid: string[];
  avisos: string[];
}

export const ORDEN_INICIAL: OrdenHome = { kpis: [...TABLERO_HOME], grid: [...SECCIONES_GRID], avisos: [...SECCIONES_AVISOS] };

/** Clave de la preferencia que guarda el acomodo de las secciones. */
export const PREFERENCIA_SECCIONES = 'home.secciones';

/**
 * Respeta el orden guardado pero solo con elementos válidos y sin repetir;
 * lo que falte se agrega al final en su orden original.
 */
export function normalizarOrden(guardado: unknown, base: readonly string[]): string[] {
  const lista = Array.isArray(guardado) ? guardado.filter((x): x is string => typeof x === 'string') : [];
  const vistos = [...new Set(lista.filter((x) => base.includes(x)))];
  return [...vistos, ...base.filter((x) => !vistos.includes(x))];
}

/** Mueve un elemento a la posición de otro (o a un índice) dentro de su lista. */
export function mover(lista: string[], id: string, destino: number): string[] {
  const i = lista.indexOf(id);
  if (i < 0 || destino < 0 || destino >= lista.length || destino === i) return lista;
  const nueva = lista.filter((x) => x !== id);
  nueva.splice(destino, 0, id);
  return nueva;
}
