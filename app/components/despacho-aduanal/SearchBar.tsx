import { Search } from "lucide-react";

interface SearchBarProps {
  busqueda: string;
  onBusquedaChange: (value: string) => void;
}

export function SearchBar({ busqueda, onBusquedaChange }: SearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-center md:justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-1">
      <div className="relative w-full md:w-80 lg:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Filtrar etapa o estado..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aduanaBlue/15 focus:border-aduanaBlue/30"
        />
      </div>
      <span className="text-xs px-3 py-2 rounded-lg bg-aduanaBlue/10 text-aduanaBlue border border-aduanaBlue/20 font-medium">
        Workflow activo
      </span>
    </div>
  );
}
