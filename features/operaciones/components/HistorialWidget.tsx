import { HistorialCambio } from "../types";

interface HistorialWidgetProps {
  historial: HistorialCambio[];
}

export function HistorialWidget({ historial }: HistorialWidgetProps) {
  return (
    <div className="clp-card p-5">
      <h3 className="clp-section-title mb-3">
        Historial de Cambios
      </h3>
      {historial.length === 0 ? (
        <p className="text-xs text-slate-500">Sin movimientos registrados.</p>
      ) : (
        <ul className="space-y-3 max-h-[420px] overflow-auto pr-1">
          {historial.map((item) => (
            <li key={item.id} className="text-xs border-b border-slate-100 pb-2">
              <p className="text-slate-700">{item.mensaje}</p>
              <p className="text-slate-500 mt-0.5">{item.fecha}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
