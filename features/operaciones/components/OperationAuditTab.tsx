import { OperationAuditItem } from "../types";

export interface OperationAuditTabProps {
  historial: OperationAuditItem[];
}

export function OperationAuditTab({ historial }: OperationAuditTabProps) {
  return (
    <section className="clp-card overflow-hidden">
      <div className="clp-panel-head">
        <h3 className="clp-section-title">Historial de Cambios</h3>
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="clp-table min-w-[760px]">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Usuario</th>
              <th>Cambio</th>
              <th>Antes</th>
              <th>Después</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((item) => (
              <tr key={item.id}>
                <td>{item.fecha}</td>
                <td className="font-medium">{item.actor}</td>
                <td>{item.accion}</td>
                <td>{item.valorAnterior ?? "-"}</td>
                <td>{item.valorNuevo ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
