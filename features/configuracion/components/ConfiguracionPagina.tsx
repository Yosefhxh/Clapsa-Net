import { Suspense } from "react";
import type { TipoUsuario } from "@prisma/client";
import prisma from "@/shared/lib/prisma";
import { usuarioConPermiso } from "@/shared/auth/paginas";
import { obtenerMatrizPermisos, ROLES_SISTEMA } from "@/shared/auth/matriz";
import { MarcaEsqueleto, TrasEsqueleto } from "@/shared/components/ui/Esqueleto";
import { DEPENDENCIAS } from "@/features/operaciones/domain/proceso";
import { PREFIJO_FOLIO } from "@/shared/utils/folios";
import { ConfiguracionVista } from "./ConfiguracionVista";

const ETIQUETA_REQUISITO: Record<string, string> = { CLIENTE: "Cliente", DOCUMENTOS: "Documentos" };

/** Esqueleto de Configuración mientras llegan los datos. */
function ConfiguracionEsqueleto() {
  return (
    <div className="clp-cfg-pagina" aria-busy="true" aria-label="Cargando configuración">
      <div className="clp-page-head"><h1 className="clp-page-title">Configuración</h1></div>
      <div className="clp-cfg clp-esq">
        <div className="clp-card clp-cfg-nav">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ height: 34, margin: "4px 6px" }} />)}</div>
        <div className="clp-cfg-body"><div className="clp-card clp-cfg-card"><i style={{ width: "30%", height: 16 }} /><i style={{ width: "70%", marginTop: 10 }} /><i style={{ height: 120, marginTop: 16, borderRadius: 10 }} /></div></div>
      </div>
    </div>
  );
}

async function Datos() {
  await usuarioConPermiso();
  const [agencia, aduanas, pasos, documentos, claves, alertas, matriz, conteo] = await Promise.all([
    prisma.configuracionAgencia.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.aduana.findMany({ orderBy: { nombre: "asc" } }),
    prisma.paso.findMany({ orderBy: { orden: "asc" } }),
    prisma.documentoConfig.findMany({ orderBy: { tipo: "asc" } }),
    prisma.clavePedimento.findMany({ orderBy: { clave: "asc" } }),
    prisma.alertaConfig.findMany({ orderBy: { nombre: "asc" } }),
    obtenerMatrizPermisos(),
    prisma.usuario.groupBy({ by: ["tipoUsuario"], _count: { _all: true } }),
  ]);
  const nombrePaso = new Map(pasos.map((p) => [p.clave as string, p.nombre]));
  const requisitos = (clave: string, t: "IMPO" | "EXPO") => {
    const deps = DEPENDENCIAS[t][clave as keyof (typeof DEPENDENCIAS)["IMPO"]];
    return deps?.map((d) => ETIQUETA_REQUISITO[d] ?? nombrePaso.get(d) ?? d).join(", ") ?? "";
  };
  const usuarios = (rol: TipoUsuario) => conteo.find((c) => c.tipoUsuario === rol)?._count._all ?? 0;

  return (
    <TrasEsqueleto esqueleto={<ConfiguracionEsqueleto />}>
      <ConfiguracionVista
        datos={{
          agencia: {
            razonSocial: agencia.razonSocial,
            rfc: agencia.rfc,
            agenteAduanal: agencia.agenteAduanal,
            patente: agencia.patente,
            honorariosBase: Number(agencia.honorariosBase),
            ivaHonorarios: Number(agencia.ivaHonorarios),
          },
          aduanas,
          pasos: pasos.map((p) => ({ ...p, requisitosImpo: requisitos(p.clave, "IMPO"), requisitosExpo: requisitos(p.clave, "EXPO") })),
          documentos,
          claves,
          alertas,
          roles: Object.fromEntries(ROLES_SISTEMA.map((r) => [r, { permisos: matriz[r], usuarios: usuarios(r) }])) as Record<TipoUsuario, { permisos: typeof matriz.ADMIN; usuarios: number }>,
          prefijoFolio: `${PREFIJO_FOLIO.OPERACION}-AA-#####`,
        }}
      />
    </TrasEsqueleto>
  );
}

/** Configuración del despacho, con esqueleto mientras llegan los datos reales. */
export function ConfiguracionPagina() {
  return (
    <Suspense fallback={<MarcaEsqueleto><ConfiguracionEsqueleto /></MarcaEsqueleto>}>
      <Datos />
    </Suspense>
  );
}
