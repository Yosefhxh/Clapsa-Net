import { Suspense } from "react";
import { SinPermiso, usuarioConPermiso } from "@/shared/auth/paginas";
import { MarcaEsqueleto, TrasEsqueleto } from "@/shared/components/ui/Esqueleto";
import { dalCatalogosOperacion, dalListarOperaciones, dalOpcionesClientes } from "../dal/operaciones-dal";
import { OperacionesEsqueleto } from "./OperacionesEsqueleto";
import { OperacionesVista } from "./OperacionesVista";

type Params = Promise<{ nueva?: string; cliente?: string }>;

async function Datos({ params }: { params: Params }) {
  if (!(await usuarioConPermiso("operaciones.ver"))) return <SinPermiso />;
  const [operaciones, opciones, catalogos, p] = await Promise.all([dalListarOperaciones(), dalOpcionesClientes(), dalCatalogosOperacion(), params]);
  return (
    <TrasEsqueleto esqueleto={<OperacionesEsqueleto />}>
      <OperacionesVista
        operaciones={operaciones}
        opciones={opciones}
        aduanas={catalogos.aduanas}
        claves={catalogos.claves}
        documentos={catalogos.documentos}
        patente={catalogos.patente}
        siguienteFolio={catalogos.siguienteFolio}
        nueva={p.nueva === "1" ? { cliente: Number(p.cliente) || null } : null}
      />
    </TrasEsqueleto>
  );
}

/** Operaciones: tablero y tabla, con esqueleto mientras llegan los datos reales. */
export function OperacionesPagina({ params }: { params: Params }) {
  return (
    <Suspense fallback={<MarcaEsqueleto><OperacionesEsqueleto /></MarcaEsqueleto>}>
      <Datos params={params} />
    </Suspense>
  );
}
