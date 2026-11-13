import type { OperacionResumen } from '@/features/operaciones/types/vistas';

export type CategoriaWidget = 'Operación' | 'Transporte y arribo' | 'Pagos y cobranza';
export type TonoWidget = 'azul' | 'verde' | 'ambar' | 'rojo' | 'morado' | 'gris';
export type IconoWidget = 'caja' | 'alerta' | 'documento' | 'camion' | 'reloj' | 'check' | 'usuario' | 'barco' | 'dinero';

export const TONOS: Record<TonoWidget, { color: string; nombre: string }> = {
  rojo: { color: '#E0614F', nombre: 'Urgente' },
  ambar: { color: '#E3A23B', nombre: 'Por atender' },
  azul: { color: '#5B86E5', nombre: 'En proceso' },
  verde: { color: '#2E9E7A', nombre: 'Terminado' },
  morado: { color: '#8C7BD8', nombre: 'Cobranza' },
  gris: { color: '#A2AABD', nombre: 'Informativo' },
};

export interface DefinicionWidget {
  id: string;
  titulo: string;
  categoria: CategoriaWidget;
  icono: IconoWidget;
  tono: TonoWidget;
  descripcion: string;
  /** Qué operaciones cuenta. Al picar el widget, la tabla del Home se filtra con esto. */
  cumple: (o: OperacionResumen, ahora: number) => boolean;
}

const H48 = 48 * 3_600_000;
const abierta = (o: OperacionResumen) => o.estado !== 'CERRADA';
const hecho = (o: OperacionResumen, clave: keyof OperacionResumen['estadosPasos']) => {
  const e = o.estadosPasos[clave];
  return e === 'COMPLETADO' || e === 'NO_APLICA';
};
const liberada = (o: OperacionResumen) => o.estadosPasos.MODULACION === 'COMPLETADO';
const eta = (o: OperacionResumen) => (o.eta ? new Date(o.eta).getTime() : null);

/** Widgets con datos reales del sistema. */
export const WIDGETS: DefinicionWidget[] = [
  { id: 'por_despachar', titulo: 'Por despachar', categoria: 'Operación', icono: 'caja', tono: 'ambar', descripcion: 'Operaciones abiertas que aún no salen de la aduana.', cumple: (o) => abierta(o) && !liberada(o) },
  { id: 'en_espera_cliente', titulo: 'En espera de cliente', categoria: 'Operación', icono: 'usuario', tono: 'azul', descripcion: 'Operaciones abiertas sin cliente o sin importador.', cumple: (o) => o.estado === 'EN_ESPERA_CLIENTE' },
  { id: 'reconocimiento', titulo: 'En reconocimiento', categoria: 'Operación', icono: 'alerta', tono: 'rojo', descripcion: 'Semáforo rojo esperando la revisión de la aduana.', cumple: (o) => o.estadosPasos.MODULACION === 'RECONOCIMIENTO' },
  { id: 'trafico_activo', titulo: 'Tráfico activo', categoria: 'Operación', icono: 'camion', tono: 'verde', descripcion: 'Todas las operaciones abiertas.', cumple: abierta },
  { id: 'desaduanadas', titulo: 'Desaduanadas', categoria: 'Operación', icono: 'check', tono: 'verde', descripcion: 'Mercancía liberada que aún no se cierra.', cumple: (o) => abierta(o) && liberada(o) },
  { id: 'cerradas_mes', titulo: 'Cerradas este mes', categoria: 'Operación', icono: 'check', tono: 'gris', descripcion: 'Operaciones con cuenta de gastos emitida este mes.', cumple: (o, ahora) => {
    if (!o.cerradaEn) return false;
    const c = new Date(o.cerradaEn), h = new Date(ahora);
    return c.getFullYear() === h.getFullYear() && c.getMonth() === h.getMonth();
  } },
  { id: 'proximo_llegar', titulo: 'Próximo a llegar', categoria: 'Transporte y arribo', icono: 'reloj', tono: 'azul', descripcion: 'ETA en las próximas 48 horas.', cumple: (o, ahora) => {
    const t = eta(o);
    return abierta(o) && t != null && t >= ahora && t - ahora <= H48;
  } },
  { id: 'en_transito', titulo: 'En tránsito', categoria: 'Transporte y arribo', icono: 'barco', tono: 'azul', descripcion: 'Importaciones con ETA futura.', cumple: (o, ahora) => {
    const t = eta(o);
    return abierta(o) && o.tipo === 'IMPO' && t != null && t > ahora;
  } },
  { id: 'por_revalidar', titulo: 'Por revalidar BL', categoria: 'Transporte y arribo', icono: 'documento', tono: 'ambar', descripcion: 'Buque arribado y BL sin revalidar.', cumple: (o, ahora) => {
    const t = eta(o);
    return abierta(o) && o.estadosPasos.REVALIDACION_BL != null && !hecho(o, 'REVALIDACION_BL') && t != null && t <= ahora;
  } },
  { id: 'por_pagar', titulo: 'Por pagar pedimento', categoria: 'Pagos y cobranza', icono: 'dinero', tono: 'ambar', descripcion: 'Pedimentos validados que no se han pagado.', cumple: (o) => o.situacion === 'Por pagar pedimento' },
  { id: 'cuentas_por_emitir', titulo: 'Cuentas por emitir', categoria: 'Pagos y cobranza', icono: 'dinero', tono: 'morado', descripcion: 'Mercancía entregada sin cuenta de gastos.', cumple: (o) => abierta(o) && liberada(o) && hecho(o, 'FT_NACIONAL') && o.estadosPasos.CUENTA_GASTOS !== 'COMPLETADO' },
  { id: 'docs_rechazados', titulo: 'Documentos rechazados', categoria: 'Pagos y cobranza', icono: 'documento', tono: 'rojo', descripcion: 'Operaciones con documentos esperando nueva versión.', cumple: (o) => abierta(o) && o.documentosRechazados > 0 },
];

export const WIDGET = (id: string) => WIDGETS.find((w) => w.id === id);

/** Texto corto bajo el número de cada widget del Home (siempre con datos reales). */
export function notaWidget(id: string, operaciones: OperacionResumen[], ahora: number): string {
  const abiertas = operaciones.filter(abierta);
  switch (id) {
    case 'por_despachar': {
      const semana = abiertas.filter((o) => !liberada(o) && (() => { const t = eta(o); return t != null && t >= ahora && t - ahora <= 7 * 86_400_000; })()).length;
      return semana ? `${semana} ${semana === 1 ? 'llega' : 'llegan'} esta semana` : 'Sin arribos esta semana';
    }
    case 'reconocimiento': return 'Semáforo rojo';
    case 'por_pagar': return 'Validados sin pago';
    case 'trafico_activo': {
      const porAduana = new Map<string, number>();
      abiertas.forEach((o) => porAduana.set(o.aduana, (porAduana.get(o.aduana) ?? 0) + 1));
      return [...porAduana].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, n]) => `${a} ${n}`).join(' · ') || 'Sin operaciones abiertas';
    }
    case 'proximo_llegar': return 'ETA en 48 h';
    case 'desaduanadas': return 'Liberadas sin cerrar';
    default: return WIDGET(id)?.descripcion ?? '';
  }
}

export const MAX_WIDGETS = 6;

export interface WidgetElegido {
  widget: string;
  tono: TonoWidget;
  umbral: number | null;
}

export const WIDGETS_INICIALES: WidgetElegido[] = ['por_despachar', 'reconocimiento', 'por_pagar', 'trafico_activo', 'proximo_llegar', 'desaduanadas'].map((id) => ({
  widget: id,
  tono: WIDGET(id)!.tono,
  umbral: null,
}));
