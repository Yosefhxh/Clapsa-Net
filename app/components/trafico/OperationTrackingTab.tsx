"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Clock3, CheckCircle2, CircleAlert } from "lucide-react";
import { actualizarEstadoEtapaDespacho } from "@/app/lib/actions/despacho";
import { OperationStageState, OperationStageView, stageLabels, stageStyles } from "./types";

export interface OperationTrackingTabProps {
  traficoId: string;
  etapas: OperationStageView[];
}

const nextActionLabel: Record<OperationStageState, string> = {
  pendiente: "Pendiente",
  "en-proceso": "En Proceso",
  completado: "Completado",
};

function getIcon(estado: OperationStageState) {
  if (estado === "completado") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (estado === "en-proceso") return <CircleAlert className="w-4 h-4 text-amber-600" />;
  return <Clock3 className="w-4 h-4 text-slate-400" />;
}

export function OperationTrackingTab({ traficoId, etapas }: OperationTrackingTabProps) {
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const [optimisticEtapas, setOptimisticEtapas] = useOptimistic(
    etapas,
    (currentEtapas, update: { pasoId: string; estado: OperationStageState }) =>
      currentEtapas.map((etapa) =>
        etapa.pasoId === update.pasoId
          ? { ...etapa, estado: update.estado }
          : etapa
      )
  );

  const etapasFiltradas = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return optimisticEtapas;
    return optimisticEtapas.filter((etapa) => `${etapa.nombre} ${etapa.estado}`.toLowerCase().includes(term));
  }, [filter, optimisticEtapas]);

  const handleChangeEstado = (pasoId: string, estado: OperationStageState) => {
    startTransition(async () => {
      // 1. Actualización optimista instantánea en UI
      setOptimisticEtapas({ pasoId, estado });
      // 2. Mutación real en backend mediante Server Action
      await actualizarEstadoEtapaDespacho({ traficoId, pasoId, estado });
    });
  };

  return (
    <section className="space-y-4">
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
        <label className="text-sm font-medium text-slate-700 block mb-2">Filtrar etapa o estado</label>
        <input
          type="text"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filtrar etapa o estado..."
          className="w-full md:max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aduanaBlue/20"
        />
      </div>

      <div className={`space-y-3 ${isPending ? "opacity-70 transition-opacity" : ""}`}>
        {etapasFiltradas.map((etapa) => (
          <article key={etapa.id} className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">{getIcon(etapa.estado)}</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{etapa.nombre}</p>
                <p className="text-xs text-slate-500">
                  Inicio: {etapa.fechaInicio ?? "-"} | Fin: {etapa.fechaFin ?? "-"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  SLA: {typeof etapa.tiempoInvertido === "number" ? `${etapa.tiempoInvertido}s` : "-"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${stageStyles[etapa.estado]}`}>
                {stageLabels[etapa.estado]}
              </span>
              <button
                type="button"
                onClick={() => handleChangeEstado(etapa.pasoId, "pendiente")}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                {nextActionLabel.pendiente}
              </button>
              <button
                type="button"
                onClick={() => handleChangeEstado(etapa.pasoId, "en-proceso")}
                className="px-2.5 py-1.5 text-xs border border-amber-300 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100"
              >
                {nextActionLabel["en-proceso"]}
              </button>
              <button
                type="button"
                onClick={() => handleChangeEstado(etapa.pasoId, "completado")}
                className="px-2.5 py-1.5 text-xs border border-green-300 rounded-lg text-green-700 bg-green-50 hover:bg-green-100"
              >
                {nextActionLabel.completado}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}