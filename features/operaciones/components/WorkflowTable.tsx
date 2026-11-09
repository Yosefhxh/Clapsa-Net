import { CheckCircle2, Clock3 } from "lucide-react";
import { PasoDespacho, PasoEstado, estadoStyles, estadoLabel } from "../types";

interface WorkflowTableProps {
  pasos: PasoDespacho[];
  onEstadoPaso: (id: number, estado: PasoEstado) => void;
}

export function WorkflowTable({ pasos, onEstadoPaso }: WorkflowTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="clp-table  min-w-[780px]">
        <thead>
          <tr>
            <th>
              Etapa
            </th>
            <th>
              Fecha
            </th>
            <th>
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {pasos.map((paso) => (
            <tr key={paso.id}>
              <td>
                <div className="flex items-center gap-3">
                  <div className="clp-icono">
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
              <td>
                {paso.fecha}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <span
                    className={`clp-badge ${
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
                    className="clp-input h-8 w-auto text-xs"
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
