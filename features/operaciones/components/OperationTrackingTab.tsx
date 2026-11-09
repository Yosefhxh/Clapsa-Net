"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Clock3, CheckCircle2, CircleAlert } from "lucide-react";
import { actualizarEstadoEtapaDespacho } from "../actions/operaciones-actions";
import { OperationStageState, OperationStageView, stageLabels, stageStyles } from "../types";

export interface OperationTrackingTabProps {
  traficoId: string;
  etapas: OperationStageView[];
  onChangeEstado?: (input: {
    traficoId: string;
    pasoId: string;
    estado: OperationStageState;
  }) => Promise<{ success: boolean; message: string }>;
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

export function OperationTrackingTab({ traficoId, etapas, onChangeEstado }: OperationTrackingTabProps) {
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
      if (onChangeEstado) {
        await onChangeEstado({ traficoId, pasoId, estado });
      } else {
        await actualizarEstadoEtapaDespacho({ traficoId, pasoId, estado });
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="clp-card p-5">
        <label className="clp-label">Filtrar etapa o estado</label>
        <input
          type="text"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filtrar etapa o estado..."
          className="clp-input md:max-w-md"
        />
      </div>

      <div className={`space-y-3 ${isPending ? "opacity-70 transition-opacity" : ""}`}>
        {etapasFiltradas.map((etapa) => (
          <article key={etapa.id} className="clp-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="clp-icono">{getIcon(etapa.estado)}</div>
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
              <span className={`clp-badge ${stageStyles[etapa.estado]}`}>
                {stageLabels[etapa.estado]}
              </span>
              <button
                type="button"
                onClick={() => handleChangeEstado(etapa.pasoId, "pendiente")}
                className="clp-btn clp-btn-secondary clp-btn-sm"
              >
                {nextActionLabel.pendiente}
              </button>
              <button
                type="button"
                onClick={() => handleChangeEstado(etapa.pasoId, "en-proceso")}
                className="clp-btn clp-btn-sm border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                {nextActionLabel["en-proceso"]}
              </button>
              <button
                type="button"
                onClick={() => handleChangeEstado(etapa.pasoId, "completado")}
                className="clp-btn clp-btn-sm border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
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