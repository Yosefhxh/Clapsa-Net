import 'server-only';

import type { EstadoCatalogo, TipoCliente } from '@prisma/client';
import prisma from '@/shared/lib/prisma';
import { PREFIJO_FOLIO, verSiguienteFolio } from '@/shared/utils/folios';
import { dalListarOperaciones } from '@/features/operaciones/dal/operaciones-dal';

export interface OperacionReciente {
  id: string;
  folio: string;
  situacion: string;
}

export interface ClienteVista {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
  domicilio: string;
  tipo: TipoCliente;
  estado: EstadoCatalogo;
  fechaAlta: string;
  encargoConferido: boolean;
  fechaVigenciaEncargo: string | null;
  pdfEncargoUrl: string | null;
  pdfConstanciaUrl: string | null;
  padronImportadores: boolean | null;
  clientePadreId: number | null;
  clientePadreNombre: string | null;
  operaciones: number;
  operacionesAbiertas: number;
  ultimaOperacion: string | null;
  /** Hasta 4 operaciones abiertas más recientes, con su situación. */
  recientes: OperacionReciente[];
}

/** Clientes de un tipo con su uso en operaciones (como cliente o como importador). */
export async function dalListarClientes(tipo: TipoCliente): Promise<ClienteVista[]> {
  const [clientes, operaciones] = await Promise.all([
    prisma.cliente.findMany({
      where: { tipo },
      orderBy: { id: 'desc' },
      include: {
        clientePadre: { select: { razonSocial: true } },
        traficos: { select: { createdAt: true, cerradaEn: true } },
        traficosImportador: { select: { id: true, createdAt: true, cerradaEn: true, clienteId: true } },
      },
    }),
    dalListarOperaciones(),
  ]);
  return clientes.map((c) => {
    // Una operación de cliente directo aparece en ambas listas: se cuenta una vez.
    const comoImportador = c.traficosImportador.filter((t) => t.clienteId !== c.id);
    const todas = [...c.traficos, ...comoImportador];
    const ultima = todas.reduce<Date | null>((max, t) => (!max || t.createdAt > max ? t.createdAt : max), null);
    const recientes = operaciones
      .filter((o) => o.clienteFolio === c.folio && o.estado !== 'CERRADA')
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
      .slice(0, 4)
      .map((o) => ({ id: o.id, folio: o.folio, situacion: o.situacion }));
    return {
      id: c.id,
      folio: c.folio,
      razonSocial: c.razonSocial,
      rfc: c.rfc,
      domicilio: c.domicilio,
      tipo: c.tipo,
      estado: c.estado,
      fechaAlta: c.fechaAlta.toISOString(),
      encargoConferido: c.encargoConferido,
      fechaVigenciaEncargo: c.fechaVigenciaEncargo?.toISOString() ?? null,
      pdfEncargoUrl: c.pdfEncargoUrl,
      pdfConstanciaUrl: c.pdfConstanciaUrl,
      padronImportadores: c.padronImportadores,
      clientePadreId: c.clientePadreId,
      clientePadreNombre: c.clientePadre?.razonSocial ?? null,
      operaciones: todas.length,
      operacionesAbiertas: todas.filter((t) => !t.cerradaEn).length,
      ultimaOperacion: ultima?.toISOString() ?? null,
      recientes,
    };
  });
}

/** Forwarders que pueden atender a un cliente directo (la pantalla ofrece solo los activos). */
export async function dalListarForwarders() {
  return prisma.cliente.findMany({ where: { tipo: 'FORWARDER' }, orderBy: { razonSocial: 'asc' }, select: { id: true, folio: true, razonSocial: true, estado: true } });
}

/** Folio que recibiría el siguiente cliente de cada tipo (solo para mostrarlo). */
export async function dalSiguientesFolios() {
  const [DIRECTO, FORWARDER] = await Promise.all([verSiguienteFolio(PREFIJO_FOLIO.DIRECTO), verSiguienteFolio(PREFIJO_FOLIO.FORWARDER)]);
  return { DIRECTO, FORWARDER };
}
