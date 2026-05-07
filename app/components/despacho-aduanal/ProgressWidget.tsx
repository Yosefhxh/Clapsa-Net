import { PasoDespacho } from "./types";

interface ProgressWidgetProps {
  pasos: PasoDespacho[];
  progreso: number;
}

export function ProgressWidget({ pasos, progreso }: ProgressWidgetProps) {
  const completados = pasos.filter((paso) => paso.estado === "completado").length;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">
        Progreso General
      </h3>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
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
