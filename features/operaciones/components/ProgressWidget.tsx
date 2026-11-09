import { PasoDespacho } from "../types";

interface ProgressWidgetProps {
  pasos: PasoDespacho[];
  progreso: number;
}

export function ProgressWidget({ pasos, progreso }: ProgressWidgetProps) {
  const completados = pasos.filter((paso) => paso.estado === "completado").length;

  return (
    <div className="clp-card p-5">
      <h3 className="clp-section-title mb-2">
        Progreso General
      </h3>
      <div className="clp-progreso mb-2">
        <div
          className="h-full bg-aduanaBlue transition-all"
          style={{ width: `${progreso}%` }}
        />
      </div>
      <p className="text-sm text-slate-600">
        <strong>{progreso}%</strong> completado
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Etapas completadas: {completados} de {pasos.length}
      </p>
    </div>
  );
}
