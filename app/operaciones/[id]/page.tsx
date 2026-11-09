import { notFound } from "next/navigation";
import { SinPermiso, usuarioConPermiso } from "@/shared/auth/paginas";
import { OperacionDetalleVista } from "@/features/operaciones/components/detalle/OperacionDetalleVista";
import { dalCatalogosOperacion, dalObtenerOperacion, dalOpcionesClientes } from "@/features/operaciones/dal/operaciones-dal";
import { asegurarEstructuraOperacion } from "@/features/operaciones/servicio/operaciones-servicio";
import { dalProveedoresPorServicio } from "@/features/proveedores/dal/proveedores-dal";

export default async function OperacionPage({ params }: { params: Promise<{ id: string }> }) {
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

  return <OperacionDetalleVista operacion={operacion} opciones={opciones} claves={catalogos.claves} proveedores={proveedores} />;
}
