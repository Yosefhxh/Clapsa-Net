import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SinPermiso, usuarioConPermiso } from "@/shared/auth/paginas";
import { MarcaEsqueleto, TrasEsqueleto } from "@/shared/components/ui/Esqueleto";
import { OperacionDetalleVista } from "@/features/operaciones/components/detalle/OperacionDetalleVista";
import { OperacionEsqueleto } from "@/features/operaciones/components/detalle/OperacionEsqueleto";
import { dalCatalogosOperacion, dalObtenerOperacion, dalOpcionesClientes } from "@/features/operaciones/dal/operaciones-dal";
import { asegurarEstructuraOperacion } from "@/features/operaciones/servicio/operaciones-servicio";
import { dalProveedoresPorServicio } from "@/features/proveedores/dal/proveedores-dal";

async function Datos({ params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioConPermiso("operaciones.ver"))) return <SinPermiso />;
  const { id } = await params;

  // Operaciones anteriores a este proceso: se les crean los pasos y documentos que falten.
  await asegurarEstructuraOperacion(id);
  const [operacion, opciones, catalogos, proveedores] = await Promise.all([
    dalObtenerOperacion(id),
    dalOpcionesClientes(),
    dalCatalogosOperacion(),
    dalProveedoresPorServicio(),
  ]);
  if (!operacion) notFound();

  return (
    <TrasEsqueleto esqueleto={<OperacionEsqueleto />}>
      <OperacionDetalleVista key={operacion.id} operacion={operacion} opciones={opciones} claves={catalogos.claves} proveedores={proveedores} />
    </TrasEsqueleto>
  );
}

export default function OperacionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<MarcaEsqueleto><OperacionEsqueleto /></MarcaEsqueleto>}>
      <Datos params={params} />
    </Suspense>
  );
}
