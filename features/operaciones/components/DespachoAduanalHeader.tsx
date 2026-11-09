import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function DespachoAduanalHeader() {
  return (
    <div className="clp-page-head flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="clp-page-title">Despacho Aduanal</h1>
        <p className="clp-page-sub mt-0.5 text-sm">
          Seguimiento operativo del pedimento y avance por etapa.
        </p>
      </div>
      <Link
        href="/operaciones"
        className="clp-btn clp-btn-secondary"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a operaciones
      </Link>
    </div>
  );
}
