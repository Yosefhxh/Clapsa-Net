import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function DespachoAduanalHeader() {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Despacho Aduanal</h1>
        <p className="text-slate-500 text-sm">
          Seguimiento operativo del pedimento y avance por etapa.
        </p>
      </div>
      <Link
        href="/operaciones"
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a operaciones
      </Link>
    </div>
  );
}
