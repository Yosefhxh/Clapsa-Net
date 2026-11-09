import { Search } from "lucide-react";

interface SearchBarProps {
  busqueda: string;
  onBusquedaChange: (value: string) => void;
}

export function SearchBar({ busqueda, onBusquedaChange }: SearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-center md:justify-between clp-card p-5 mb-1">
      <div className="relative w-full md:w-80 lg:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Filtrar etapa o estado..."
          className="clp-input pl-10"
        />
      </div>
      <span className="clp-chip">
        Workflow activo
      </span>
    </div>
  );
}
