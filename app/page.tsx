import prisma from "@/shared/lib/prisma";
import { usuarioConPermiso } from "@/shared/auth/paginas";
import { HomeVista } from "@/features/home/components/HomeVista";
import { WIDGETS_INICIALES, type TonoWidget } from "@/features/home/widgets";
import { dalListarOperaciones } from "@/features/operaciones/dal/operaciones-dal";

const DIAS_AVISO_ENCARGO = 30;

/** Fecha hasta la que un encargo conferido cuenta como "por vencer". */
const limiteAvisoEncargo = () => new Date(Date.now() + DIAS_AVISO_ENCARGO * 86_400_000);

export default async function Home() {
  const usuario = (await usuarioConPermiso())!;
  const limiteEncargo = limiteAvisoEncargo();

  const [operaciones, guardados, alertas, encargos] = await Promise.all([
    dalListarOperaciones(),
    prisma.widgetUsuario.findMany({ where: { usuarioId: usuario.id }, orderBy: { orden: "asc" } }),
    prisma.alertaConfig.findMany({ where: { activa: true }, select: { clave: true } }),
    prisma.cliente.findMany({
      where: { encargoConferido: true, fechaVigenciaEncargo: { gte: new Date(), lte: limiteEncargo } },
      select: { folio: true, razonSocial: true, fechaVigenciaEncargo: true },
      orderBy: { fechaVigenciaEncargo: "asc" },
    }),
  ]);

  const widgets = guardados.length
    ? guardados.map((w) => ({ widget: w.widget, tono: w.tono as TonoWidget, umbral: w.umbral }))
    : WIDGETS_INICIALES;

  return (
    <HomeVista
      operaciones={operaciones}
      widgets={widgets}
      alertasActivas={alertas.map((a) => a.clave)}
      encargosPorVencer={encargos.map((e) => ({ folio: e.folio, razonSocial: e.razonSocial, vence: e.fechaVigenciaEncargo!.toISOString() }))}
    />
  );
}
