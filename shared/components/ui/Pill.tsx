import type { ReactNode } from "react";

export type TonoPill = "ok" | "alerta" | "riesgo" | "info" | "neutro" | "morado";

/** Etiqueta de estado con color por significado (no decorativo). */
export function Pill({ tono = "neutro", children, punto = true }: { tono?: TonoPill; children: ReactNode; punto?: boolean }) {
  return <span className={`clp-pill clp-pill-${tono} ${punto ? "" : "clp-pill-sin-punto"}`}>{children}</span>;
}
