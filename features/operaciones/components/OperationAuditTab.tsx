import { OperationAuditItem } from "../types";

export interface OperationAuditTabProps {
  historial: OperationAuditItem[];
}

export function OperationAuditTab({ historial }: OperationAuditTabProps) {
  return (
    <section className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">Historial de Cambios</h3>
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[760px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-white">
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Fecha y Hora</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Usuario</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Cambio</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Antes</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Después</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {historial.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-600">{item.fecha}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700">{item.actor}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{item.accion}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.valorAnterior ?? "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{item.valorNuevo ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
