import type { EstadoDocumento, EstadoPaso, Semaforo as ValorSemaforo, TipoCliente } from "@prisma/client";
import { Pill, type TonoPill } from "@/shared/components/ui/Pill";
import { ETIQUETA_ESTADO_DOCUMENTO, ETIQUETA_ESTADO_PASO } from "../types/vistas";

const TONO_SITUACION: Record<string, TonoPill> = {
  "En espera de cliente": "info",
  "En reconocimiento": "riesgo",
  "Por pagar pedimento": "alerta",
  Desaduanada: "ok",
  Despachada: "ok",
  Cerrada: "neutro",
};

export function PillSituacion({ situacion }: { situacion: string }) {
  return <Pill tono={TONO_SITUACION[situacion] ?? "info"}>{situacion}</Pill>;
}

const TONO_PASO: Record<EstadoPaso, TonoPill> = {
  PENDIENTE: "neutro",
  EN_PROCESO: "alerta",
  RECONOCIMIENTO: "riesgo",
  COMPLETADO: "ok",
  NO_APLICA: "neutro",
};

export function PillPaso({ estado }: { estado: EstadoPaso }) {
  return <Pill tono={TONO_PASO[estado]}>{ETIQUETA_ESTADO_PASO[estado]}</Pill>;
}

const TONO_DOC: Record<EstadoDocumento, TonoPill> = {
  PENDIENTE: "alerta",
  POR_REVISAR: "info",
  APROBADO: "ok",
  RECHAZADO: "riesgo",
};

export function PillDocumento({ estado }: { estado: EstadoDocumento }) {
  return <Pill tono={TONO_DOC[estado]}>{ETIQUETA_ESTADO_DOCUMENTO[estado]}</Pill>;
}

export function Semaforo({ valor }: { valor: ValorSemaforo | null }) {
  const color = valor === "VERDE" ? "#16a34a" : valor === "ROJO" ? "#dc2626" : "#cbd5e1";
  const texto = valor === "VERDE" ? "Verde" : valor === "ROJO" ? "Rojo" : "Sin modular";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
      {texto}
    </span>
  );
}

export function TipoClienteBadge({ tipo }: { tipo: TipoCliente }) {
  return <span className={`clp-tipo-cli clp-tipo-cli-${tipo.toLowerCase()}`}>{tipo === "DIRECTO" ? "Directo" : "Forwarder"}</span>;
}

export function TipoOperacionTag({ tipo }: { tipo: "IMPO" | "EXPO" }) {
  return <span className={`clp-chip ${tipo === "EXPO" ? "!bg-[#f0ebfb] !text-[#5b3aa8]" : ""}`}>{tipo}</span>;
}

export function BarraAvance({ completados, total }: { completados: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="clp-progreso !h-1.5 w-20"><i className="block h-full rounded-full bg-aduanaBlue" style={{ width: `${total ? (completados / total) * 100 : 0}%` }} /></span>
      <span className="text-xs text-slate-500 tabular-nums">{completados}/{total}</span>
    </span>
  );
}
