"use client";

import { useSyncExternalStore } from "react";

let ahora = Date.now();
const oyentes = new Set<() => void>();
let intervalo: ReturnType<typeof setInterval> | null = null;

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  if (!intervalo) {
    intervalo = setInterval(() => {
      ahora = Date.now();
      oyentes.forEach((o) => o());
    }, 60_000);
  }
  return () => {
    oyentes.delete(oyente);
    if (!oyentes.size && intervalo) {
      clearInterval(intervalo);
      intervalo = null;
    }
  };
}

/**
 * Hora actual que se refresca cada minuto (para SLA y tiempos relativos).
 * En el servidor y durante la hidratación devuelve `inicial` (la hora de la petición, si la
 * página la pasa) o 0; con 0, quien lo use debe mostrar un valor neutro. Así el HTML del
 * servidor coincide con el del navegador.
 */
export function useAhora(inicial = 0): number {
  return useSyncExternalStore(suscribir, () => ahora, () => inicial);
}
