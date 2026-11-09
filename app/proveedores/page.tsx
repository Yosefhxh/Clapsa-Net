import prisma from "@/shared/lib/prisma";
import { usuarioConPermiso } from "@/shared/auth/paginas";
import { ProveedoresVista } from "@/features/proveedores/components/ProveedoresVista";
import { dalObtenerProveedores, dalPasosDeServicio } from "@/features/proveedores/dal/proveedores-dal";

export default async function ProveedoresPage() {
  await usuarioConPermiso();
  const [proveedores, pasos, aduanas] = await Promise.all([
    dalObtenerProveedores(),
    dalPasosDeServicio(),
    prisma.aduana.findMany({ where: { activa: true }, orderBy: { nombre: "asc" }, select: { nombre: true } }),
  ]);

  return <ProveedoresVista proveedores={proveedores} pasos={pasos} aduanas={aduanas.map((a) => a.nombre)} />;
}
