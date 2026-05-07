import { Plus, Search } from "lucide-react";

interface ClientesSearchBarProps {
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  onRegistrarCliente: () => void;
}

export function ClientesSearchBar({
  busqueda,
  onBusquedaChange,
  onRegistrarCliente,
}: ClientesSearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-center md:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <div className="relative w-full md:w-80 lg:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por Razón Social o RFC..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
        />
      </div>
      <button
        onClick={onRegistrarCliente}
        className="flex items-center gap-2 px-4 py-2 bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 rounded-lg hover:bg-aduanaBlue/15 hover:border-aduanaBlue/30 transition-colors font-medium md:ml-auto"
      >
        <Plus className="w-4 h-4" />
        Registrar Cliente
      </button>
    </div>
  );
}
