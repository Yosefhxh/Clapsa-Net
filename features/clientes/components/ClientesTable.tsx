import { CheckCircle2, FileText, Pencil, Trash2 } from "lucide-react";
import { Cliente } from "../types/clientes-types";

interface ClientesTableProps {
  clientes: Cliente[];
  totalClientes: number;
  onEditCliente: (cliente: Cliente) => void;
  onDeleteCliente: (cliente: Cliente) => void;
}

export function ClientesTable({
  clientes,
  totalClientes,
  onEditCliente,
  onDeleteCliente,
}: ClientesTableProps) {
  return (
    <div className="clp-card overflow-hidden">
      <div className="clp-panel-head">
        <p className="text-sm text-slate-600">
          Total de clientes registrados: <strong>{totalClientes}</strong>
        </p>
      </div>
      <table className="clp-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Razón Social</th>
            <th>RFC</th>
            <th>Domicilio</th>
            <th>Estado</th>
            <th className="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientes.length > 0 ? (
            clientes.map((cliente) => (
              <tr key={cliente.id}>
                <td className="whitespace-nowrap font-mono font-medium">{cliente.folio}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="clp-icono">
                      <FileText className="w-4 h-4 text-aduanaBlue" />
                    </div>
                    <span className="font-medium text-slate-700">{cliente.razonSocial}</span>
                  </div>
                </td>
                <td className="font-mono">{cliente.rfc}</td>
                <td>{cliente.domicilio}</td>
                <td>
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Registrado</span>
                  </div>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEditCliente(cliente)}
                      className="clp-icon-btn"
                      aria-label={`Editar ${cliente.razonSocial}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCliente(cliente)}
                      className="clp-icon-btn clp-icon-btn-danger"
                      aria-label={`Eliminar ${cliente.razonSocial}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="clp-table-vacia">
                No hay clientes registrados. Haz clic en &quot;Registrar Cliente&quot; para comenzar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
