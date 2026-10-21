import { CheckCircle2, CircleAlert, PauseCircle } from "lucide-react";
import { OperationGlobalStatus } from "@/features/trafico/types/trafico-types";

export interface OperationHeaderProps {
  folio: string;
  clienteNombre: string;
  etapasCompletadas: number;
  etapasTotales: number;
  estadoGlobal: OperationGlobalStatus;
}

const statusStyles: Record<OperationGlobalStatus, string> = {
  "en-proceso": "bg-amber-50 text-amber-700 border border-amber-200",
  detenido: "bg-slate-50 text-slate-700 border border-slate-200",
  finalizado: "bg-green-50 text-green-700 border border-green-200",
};

function getIcon(status: OperationGlobalStatus) {
  if (status === "finalizado") return <CheckCircle2 className="w-4 h-4" />;
  if (status === "detenido") return <PauseCircle className="w-4 h-4" />;
  return <CircleAlert className="w-4 h-4" />;
}

function getLabel(status: OperationGlobalStatus) {
  if (status === "finalizado") return "Finalizado";
  if (status === "detenido") return "Detenido";
  return "En proceso";
}

export function OperationHeader({
  folio,
  clienteNombre,
  etapasCompletadas,
  etapasTotales,
  estadoGlobal,
}: OperationHeaderProps) {
  const progress = etapasTotales > 0 ? Math.round((etapasCompletadas / etapasTotales) * 100) : 0;

  return (
    <header className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Operación de Tráfico</p>
          <h2 className="text-xl font-bold text-slate-800">{folio}</h2>
          <p className="text-sm text-slate-500">Cliente: {clienteNombre}</p>
        </div>

        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${statusStyles[estadoGlobal]}`}>
          {getIcon(estadoGlobal)}
          {getLabel(estadoGlobal)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progreso general</span>
          <span>
            {etapasCompletadas}/{etapasTotales} etapas ({progress}%)
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-aduanaBlue transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </header>
  );
}
