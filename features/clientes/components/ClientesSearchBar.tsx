import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { ESTADOS_MEXICO } from "@/shared/utils/estadosMexico";

export type ClientesSortOption = "az" | "za" | "folioAsc" | "folioDesc" | "estado";

const sortLabels: Record<ClientesSortOption, string> = {
  az: "A-Z",
  za: "Z-A",
  folioAsc: "Folio menor a mayor",
  folioDesc: "Folio mayor a menor",
  estado: "Domicilio por estado",
};

interface ClientesSearchBarProps {
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  onRegistrarCliente: () => void;
  sortBy: ClientesSortOption;
  onSortChange: (value: ClientesSortOption) => void;
  estadoFiltro: string;
  onEstadoFiltroChange: (value: string) => void;
}

export function ClientesSearchBar({
  busqueda,
  onBusquedaChange,
  onRegistrarCliente,
  sortBy,
  onSortChange,
  estadoFiltro,
  onEstadoFiltroChange,
}: ClientesSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-1">
        <div className="relative w-full md:max-w-md lg:max-w-lg">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, RFC o domicilio..."
            className="clp-input pl-10"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
          />
        </div>

        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:w-auto">
          <div className="relative w-full md:w-[250px]">
            <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as ClientesSortOption)}
              className="clp-input pl-10"
              aria-label="Ordenar clientes"
            >
              {Object.entries(sortLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {sortBy === "estado" && (
            <div className="relative w-full md:w-[250px]">
              <select
                value={estadoFiltro}
                onChange={(e) => onEstadoFiltroChange(e.target.value)}
                className="clp-input"
                aria-label="Filtrar clientes por estado"
              >
                <option value="">Todos los estados</option>
                {ESTADOS_MEXICO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onRegistrarCliente}
        className="clp-btn clp-btn-primary lg:ml-auto"
      >
        <Plus className="w-4 h-4" />
        Registrar Cliente
      </button>
    </div>
  );
}
