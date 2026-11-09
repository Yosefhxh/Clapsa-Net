import { FileText } from "lucide-react";
import { PasoDespacho } from "../types";

interface FolioHeaderProps {
  folio: string;
  pasos: PasoDespacho[];
}

export function FolioHeader({ folio, pasos }: FolioHeaderProps) {
  const completados = pasos.filter((paso) => paso.estado === "completado").length;

  return (
    <div className="clp-panel-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="clp-icono">
          <FileText className="w-4 h-4 text-aduanaBlue" />
        </div>
        <div>
          <p className="text-sm text-slate-500">Folio de operacion</p>
          <p className="font-semibold text-slate-700">{folio || "Generando..."}</p>
        </div>
      </div>
      <div className="text-sm text-slate-600">
        Progreso general: <strong>{completados}/{pasos.length}</strong> etapas (
        {Math.round((completados / pasos.length) * 100)}%)
      </div>
    </div>
  );
}
