import 'server-only';

import type { TipoCliente } from '@prisma/client';
import prisma from '@/shared/lib/prisma';

export interface ClienteVista {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
  domicilio: string;
  tipo: TipoCliente;
  fechaAlta: string;
  encargoConferido: boolean;
  fechaVigenciaEncargo: string | null;
  pdfEncargoUrl: string | null;
  padronImportadores: boolean | null;
  clientePadreId: number | null;
  clientePadreNombre: string | null;
  operaciones: number;
  operacionesAbiertas: number;
  ultimaOperacion: string | null;
}

/** Clientes de un tipo con su uso en operaciones (como cliente o como importador). */
export async function dalListarClientes(tipo: TipoCliente): Promise<ClienteVista[]> {
  const clientes = await prisma.cliente.findMany({
    where: { tipo },
    orderBy: { id: 'desc' },
    include: {
      clientePadre: { select: { razonSocial: true } },
      traficos: { select: { createdAt: true, cerradaEn: true } },
      traficosImportador: { select: { id: true, createdAt: true, cerradaEn: true, clienteId: true } },
    },
  });
  return clientes.map((c) => {
    // Una operación de cliente directo aparece en ambas listas: se cuenta una vez.
    const comoImportador = c.traficosImportador.filter((t) => t.clienteId !== c.id);
    const todas = [...c.traficos, ...comoImportador];
    const ultima = todas.reduce<Date | null>((max, t) => (!max || t.createdAt > max ? t.createdAt : max), null);
    return {
      id: c.id,
      folio: c.folio,
      razonSocial: c.razonSocial,
      rfc: c.rfc,
      domicilio: c.domicilio,
      tipo: c.tipo,
      fechaAlta: c.fechaAlta.toISOString(),
      encargoConferido: c.encargoConferido,
      fechaVigenciaEncargo: c.fechaVigenciaEncargo?.toISOString() ?? null,
      pdfEncargoUrl: c.pdfEncargoUrl,
      padronImportadores: c.padronImportadores,
      clientePadreId: c.clientePadreId,
      clientePadreNombre: c.clientePadre?.razonSocial ?? null,
      operaciones: todas.length,
      operacionesAbiertas: todas.filter((t) => !t.cerradaEn).length,
      ultimaOperacion: ultima?.toISOString() ?? null,
    };
  });
}

export async function dalListarForwarders() {
  return prisma.cliente.findMany({ where: { tipo: 'FORWARDER' }, orderBy: { razonSocial: 'asc' }, select: { id: true, folio: true, razonSocial: true } });
}
