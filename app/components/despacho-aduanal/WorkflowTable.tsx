import { CheckCircle2, Clock3 } from "lucide-react";
import { PasoDespacho, PasoEstado, estadoStyles, estadoLabel } from "./types";

interface WorkflowTableProps {
  pasos: PasoDespacho[];
  onEstadoPaso: (id: number, estado: PasoEstado) => void;
}

export function WorkflowTable({ pasos, onEstadoPaso }: WorkflowTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[780px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-6 py-4 text-sm font-semibold text-slate-600">
              Etapa
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-slate-600">
              Fecha
            </th>
            <th className="px-6 py-4 text-sm font-semibold text-slate-600">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {pasos.map((paso) => (
            <tr key={paso.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    {paso.estado === "completado" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock3 className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <span className="font-medium text-slate-700">
                    {paso.etapa}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-slate-600 text-sm">
                {paso.fecha}
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      estadoStyles[paso.estado]
                    }`}
                  >
                    {estadoLabel[paso.estado]}
                  </span>
                  <select
                    value={paso.estado}
                    onChange={(e) =>
                      onEstadoPaso(paso.id, e.target.value as PasoEstado)
                    }
                    className="px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-600"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en-proceso">En Proceso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
