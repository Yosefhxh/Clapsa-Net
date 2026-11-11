import { Suspense } from "react";
import prisma from "@/shared/lib/prisma";
import { MarcaEsqueleto, TrasEsqueleto } from "@/shared/components/ui/Esqueleto";
import { HomeEsqueleto } from "@/features/home/components/HomeEsqueleto";
import { usuarioConPermiso } from "@/shared/auth/paginas";
import { HomeVista } from "@/features/home/components/HomeVista";
import { normalizarOrden, PREFERENCIA_SECCIONES, SECCIONES_AVISOS, SECCIONES_GRID, TABLERO_HOME } from "@/features/home/orden";
import { dalListarOperaciones } from "@/features/operaciones/dal/operaciones-dal";

const DIAS_AVISO_ENCARGO = 30;

/** Fecha hasta la que un encargo conferido cuenta como "por vencer". */
const limiteAvisoEncargo = () => new Date(Date.now() + DIAS_AVISO_ENCARGO * 86_400_000);

export default function Home() {
  return (
    <Suspense fallback={<MarcaEsqueleto><HomeEsqueleto /></MarcaEsqueleto>}>
      <HomeDatos />
    </Suspense>
  );
}

async function HomeDatos() {
  const usuario = (await usuarioConPermiso())!;
  const limiteEncargo = limiteAvisoEncargo();

  const [operaciones, widgets, secciones, alertas, encargos] = await Promise.all([
    dalListarOperaciones(),
    prisma.widgetUsuario.findMany({ where: { usuarioId: usuario.id }, orderBy: { orden: "asc" }, select: { widget: true } }),
    prisma.preferenciaUsuario.findUnique({ where: { usuarioId_clave: { usuarioId: usuario.id, clave: PREFERENCIA_SECCIONES } } }),
    prisma.alertaConfig.findMany({ where: { activa: true }, select: { clave: true } }),
    prisma.cliente.findMany({
      where: { encargoConferido: true, fechaVigenciaEncargo: { gte: new Date(), lte: limiteEncargo } },
      select: { folio: true, razonSocial: true, fechaVigenciaEncargo: true },
      orderBy: { fechaVigenciaEncargo: "asc" },
    }),
  ]);

  const guardadas = (secciones?.valor ?? {}) as { grid?: unknown; avisos?: unknown };
  const orden = {
    kpis: normalizarOrden(widgets.map((w) => w.widget), TABLERO_HOME),
    grid: normalizarOrden(guardadas.grid, SECCIONES_GRID),
    avisos: normalizarOrden(guardadas.avisos, SECCIONES_AVISOS),
  };

  return (
    <TrasEsqueleto esqueleto={<HomeEsqueleto />}>
      <HomeVista
        operaciones={operaciones}
        ordenGuardado={orden}
        alertasActivas={alertas.map((a) => a.clave)}
        encargosPorVencer={encargos.map((e) => ({ folio: e.folio, razonSocial: e.razonSocial, vence: e.fechaVigenciaEncargo!.toISOString() }))}
      />
    </TrasEsqueleto>
  );
}
