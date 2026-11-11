import { Suspense } from "react";
import prisma from "@/shared/lib/prisma";
import { usuarioConPermiso } from "@/shared/auth/paginas";
import { MarcaEsqueleto, TrasEsqueleto } from "@/shared/components/ui/Esqueleto";
import { dalObtenerProveedores, dalPasosDeServicio } from "../dal/proveedores-dal";
import { ProveedoresEsqueleto } from "./ProveedoresEsqueleto";
import { ProveedoresVista } from "./ProveedoresVista";

async function Datos() {
  await usuarioConPermiso();
  const [proveedores, pasos, aduanas] = await Promise.all([
    dalObtenerProveedores(),
    dalPasosDeServicio(),
    prisma.aduana.findMany({ where: { activa: true }, orderBy: { nombre: "asc" }, select: { nombre: true } }),
  ]);
  return (
    <TrasEsqueleto esqueleto={<ProveedoresEsqueleto />}>
      <ProveedoresVista proveedores={proveedores} pasos={pasos} aduanas={aduanas.map((a) => a.nombre)} />
    </TrasEsqueleto>
  );
}

/** Página de proveedores, con esqueleto mientras llegan los datos reales. */
export function ProveedoresPagina() {
  return (
    <Suspense fallback={<MarcaEsqueleto><ProveedoresEsqueleto /></MarcaEsqueleto>}>
      <Datos />
    </Suspense>
  );
}
