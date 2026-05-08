import { CheckCircle2, FileText, Pencil, Trash2 } from "lucide-react";
import { Cliente } from "./types";

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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
        <p className="text-sm text-slate-600">
          Total de clientes registrados: <strong>{totalClientes}</strong>
        </p>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-600">Folio</th>
            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Razón Social</th>
            <th className="px-6 py-4 text-sm font-semibold text-slate-600">RFC</th>
            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Domicilio</th>
            <th className="px-6 py-4 text-sm font-semibold text-slate-600">Estado</th>
            <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {clientes.length > 0 ? (
            clientes.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-slate-700 font-mono text-sm font-medium">{cliente.folio}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="w-4 h-4 text-aduanaBlue" />
                    </div>
                    <span className="font-medium text-slate-700">{cliente.razonSocial}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-sm">{cliente.rfc}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{cliente.domicilio}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Registrado</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEditCliente(cliente)}
                      className="p-2 text-slate-400 hover:text-aduanaBlue transition-colors"
                      aria-label={`Editar ${cliente.razonSocial}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCliente(cliente)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
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
              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                No hay clientes registrados. Haz clic en &quot;Registrar Cliente&quot; para comenzar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
