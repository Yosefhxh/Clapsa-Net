/**
 * @deprecated Legacy inert page scheduled for removal.
 */
import Link from 'next/link';
import { PROVEEDORES_TABS, SectionTabs } from "@/shared/components/layout/SectionTabs";
import { Search, ArrowRight } from 'lucide-react';

export default function ProveedoresBusquedaPage() {
  return (
    <div className="space-y-5">
      <div className="clp-page-head">
        <h1 className="clp-page-title">Búsqueda de Proveedores</h1>
        <p className="clp-page-sub mt-0.5 text-sm">Esta sección puede usarse después para consultar proveedores registrados y filtrarlos por RFC, tipo o razón social.</p>
        <SectionTabs label="Proveedores" tabs={PROVEEDORES_TABS} />
      </div>

      <div className="clp-card p-6 md:p-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-aduanaBlue/10 p-3 text-aduanaBlue">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="clp-section-title text-lg">Sección en preparación</h2>
              <p className="text-sm text-slate-500">La alta de proveedores ya está disponible.</p>
            </div>
          </div>
          <Link
            href="/proveedores/alta"
            className="clp-btn clp-btn-primary"
          >
            Ir a alta
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
