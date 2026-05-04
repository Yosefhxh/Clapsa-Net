import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';

export default function ProveedoresBusquedaPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Búsqueda de Proveedores</h1>
        <p className="text-sm text-slate-500">Esta sección puede usarse después para consultar proveedores registrados y filtrarlos por RFC, tipo o razón social.</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-aduanaBlue/10 p-3 text-aduanaBlue">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Sección en preparación</h2>
              <p className="text-sm text-slate-500">La alta de proveedores ya está disponible.</p>
            </div>
          </div>
          <Link
            href="/proveedores/alta"
            className="inline-flex items-center gap-2 rounded-lg border border-aduanaBlue/20 bg-aduanaBlue/10 px-4 py-2 font-medium text-aduanaBlue transition-colors hover:bg-aduanaBlue/15"
          >
            Ir a alta
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
