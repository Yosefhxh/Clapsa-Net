import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Pill } from "@/shared/components/ui/Pill";
import { ETIQUETA_MEDIO, type OperacionDetalle } from "../../types/vistas";
import { PillSituacion, Semaforo, TipoClienteBadge, TipoOperacionTag } from "../etiquetas";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">{etiqueta}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

/** Tarjeta del folio: quién, qué, en qué fase va y su avance por fase. */
export function EncabezadoOperacion({ op }: { op: OperacionDetalle }) {
  const pasosPorFase = op.fases.map((_, i) => op.pasos.filter((p) => p.fase === i + 1 && p.estado !== "NO_APLICA"));
  const completosFase1 = Number(op.cliente != null && op.importador != null) + Number(op.documentosObligatoriosAprobados);

  return (
    <section className="clp-card p-5">
      <Link href="/operaciones" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-aduanaBlue">
        <ArrowLeft className="h-4 w-4" /> Operaciones
      </Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Operación de tráfico</div>
          <div className="clp-mono mt-0.5 text-xl font-bold text-slate-900">{op.folio}</div>
          <div className="mt-0.5 text-sm text-slate-600">
            Cliente: {op.cliente ? <>{op.cliente.razonSocial} <TipoClienteBadge tipo={op.cliente.tipo} /></> : "Sin cliente asignado"}
          </div>
          {op.cliente?.tipo === "FORWARDER" && op.importador ? (
            <div className="text-sm text-slate-600">Importador en pedimento: {op.importador.razonSocial}</div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
          <Dato etiqueta="Tipo"><TipoOperacionTag tipo={op.tipo} /></Dato>
          <Dato etiqueta="Aduana">{op.aduana}</Dato>
          <Dato etiqueta="Transporte">{ETIQUETA_MEDIO[op.medio]}</Dato>
          <Dato etiqueta="Pedimento"><span className="clp-mono">{op.numeroPedimento ?? "—"}</span></Dato>
          <Dato etiqueta="Semáforo"><Semaforo valor={op.semaforo} /></Dato>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 lg:items-end">
          {op.estado === "CERRADA" ? <Pill tono="ok">Cerrada</Pill> : op.estado === "EN_ESPERA_CLIENTE" ? <Pill tono="info">En espera de cliente</Pill> : <Pill tono="alerta">En proceso</Pill>}
          {op.estado === "EN_PROCESO" ? <PillSituacion situacion={op.situacion} /> : null}
        </div>
      </div>

      <div className="mt-5 flex justify-between text-sm text-slate-600">
        <span>Fase <b className="text-aduanaBlue">{op.fase} de 8 · {op.fases[op.fase - 1]}</b></span>
        <span className="tabular-nums">{op.avance.completados}/{op.avance.total} pasos ({op.avance.porcentaje}%)</span>
      </div>
      <div className="clp-fases mt-2">
        {op.fases.map((nombre, i) => {
          const ps = pasosPorFase[i];
          const hechos = i === 0 ? completosFase1 : ps.filter((p) => p.estado === "COMPLETADO").length;
          const total = i === 0 ? 2 : ps.length;
          const pct = total ? (hechos / total) * 100 : 100;
          return (
            <div key={nombre} className={i + 1 === op.fase && op.estado !== "CERRADA" ? "clp-fase-activa" : ""} title={`${nombre}: ${hechos}/${total}`}>
              <div className="clp-fase-barra"><i style={{ width: `${pct}%` }} /></div>
              <div className="clp-fase-nombre">{i + 1}. {nombre}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
