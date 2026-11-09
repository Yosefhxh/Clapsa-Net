import prisma from "@/shared/lib/prisma";
import { usuarioConPermiso } from "@/shared/auth/paginas";
import { ConfiguracionVista } from "@/features/configuracion/components/ConfiguracionVista";
import { DEPENDENCIAS } from "@/features/operaciones/domain/proceso";

const ETIQUETA_REQUISITO: Record<string, string> = { CLIENTE: "cliente", DOCUMENTOS: "documentos" };

export default async function ConfiguracionPage() {
  await usuarioConPermiso();
  const [agencia, aduanas, pasos, documentos, claves, alertas] = await Promise.all([
    prisma.configuracionAgencia.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    prisma.aduana.findMany({ orderBy: { nombre: "asc" } }),
    prisma.paso.findMany({ orderBy: { orden: "asc" } }),
    prisma.documentoConfig.findMany({ orderBy: { tipo: "asc" } }),
    prisma.clavePedimento.findMany({ orderBy: { clave: "asc" } }),
    prisma.alertaConfig.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  const nombrePaso = new Map(pasos.map((p) => [p.clave as string, p.nombre.toLowerCase()]));
  const requisitos = (clave: string) =>
    (["IMPO", "EXPO"] as const)
      .map((t) => {
        const deps = DEPENDENCIAS[t][clave as keyof (typeof DEPENDENCIAS)["IMPO"]];
        return deps?.length ? `${t}: ${deps.map((d) => ETIQUETA_REQUISITO[d] ?? nombrePaso.get(d) ?? d).join(", ")}` : null;
      })
      .filter(Boolean)
      .join(" · ");

  return (
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
        pasos: pasos.map((p) => ({ ...p, requisitos: requisitos(p.clave) })),
        documentos,
        claves,
        alertas,
      }}
    />
  );
}
