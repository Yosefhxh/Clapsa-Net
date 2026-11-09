import { SinPermiso, usuarioConPermiso } from "@/shared/auth/paginas";
import { BandejaOperaciones } from "@/features/operaciones/components/BandejaOperaciones";
import { dalCatalogosOperacion, dalListarOperaciones, dalOpcionesClientes } from "@/features/operaciones/dal/operaciones-dal";

export default async function OperacionesPage() {
  if (!(await usuarioConPermiso("operaciones.ver"))) return <SinPermiso />;
  const [operaciones, opciones, catalogos] = await Promise.all([
    dalListarOperaciones(),
    dalOpcionesClientes(),
    dalCatalogosOperacion(),
  ]);

  return <BandejaOperaciones operaciones={operaciones} opciones={opciones} aduanas={catalogos.aduanas} claves={catalogos.claves} />;
}
