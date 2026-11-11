import 'server-only';

import { Prisma, RequisitoDocumento, type EstadoPaso, type HitoOperativo, type TipoOperacion } from '@prisma/client';
import prisma from '@/shared/lib/prisma';
import { PREFIJO_FOLIO, verSiguienteFolio } from '@/shared/utils/folios';
import {
  FASES,
  avance,
  estadoOperacion,
  faseActual,
  faseDelPaso,
  motivoBloqueo,
  proximoPaso,
  situacionOperacion,
  type ContextoOperacion,
  type PasoResumen,
} from '../domain/proceso';
import type { OperacionDetalle, OperacionResumen, OpcionCliente } from '../types/vistas';

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Requisito de cada tipo de documento según el tipo de operación (desde Configuración). */
export async function dalRequisitosDocumentos(tipo: TipoOperacion) {
  const config = await prisma.documentoConfig.findMany();
  return new Map(config.map((c) => [c.tipo, { ...c, requisito: tipo === 'IMPO' ? c.requisitoImpo : c.requisitoExpo }]));
}

const incluirResumen = {
  cliente: { select: { folio: true, razonSocial: true, tipo: true } },
  importador: { select: { razonSocial: true } },
  pasos: { select: { estado: true, paso: { select: { clave: true, nombre: true, faseImpo: true, faseExpo: true, orden: true, ordenExpo: true } } } },
  documentos: { select: { tipo: true, estado: true } },
  contenedores: { select: { numeroContenedor: true } },
} satisfies Prisma.TraficoInclude;

type TraficoResumen = Prisma.TraficoGetPayload<{ include: typeof incluirResumen }>;

function pasosResumen(t: { tipoOperacion: TipoOperacion; pasos: TraficoResumen['pasos'] }): PasoResumen[] {
  return t.pasos.map((p) => ({
    clave: p.paso.clave,
    fase: faseDelPaso(p.paso, t.tipoOperacion),
    orden: (t.tipoOperacion === 'EXPO' ? p.paso.ordenExpo : null) ?? p.paso.orden,
    estado: p.estado,
  }));
}

function docsObligatoriosOk(
  docs: { tipo: string; estado: string }[],
  requisitos: Map<string, { requisito: RequisitoDocumento }>,
) {
  return [...requisitos.entries()]
    .filter(([, r]) => r.requisito === RequisitoDocumento.OBLIGATORIO)
    .every(([tipo]) => docs.some((d) => d.tipo === tipo && d.estado === 'APROBADO'));
}

function aResumen(t: TraficoResumen, requisitos: Map<string, { requisito: RequisitoDocumento }>): OperacionResumen {
  const pasos = pasosResumen(t);
  const ctx = {
    tipo: t.tipoOperacion,
    tieneCliente: t.clienteId != null,
    tieneImportador: t.importadorId != null,
    documentosObligatoriosAprobados: docsObligatoriosOk(t.documentos, requisitos),
    cerrada: t.cerradaEn != null,
  };
  const fase = faseActual(pasos, ctx);
  const estados = Object.fromEntries(pasos.map((p) => [p.clave, p.estado])) as Partial<Record<HitoOperativo, EstadoPaso>>;
  const nombres = new Map(t.pasos.map((p) => [p.paso.clave, p.paso.nombre]));
  return {
    id: t.id,
    folio: t.referenciaAutomatica,
    folioManual: t.folioManual,
    tipo: t.tipoOperacion,
    medio: t.medioTransporte,
    aduana: t.aduana,
    eta: iso(t.eta),
    clienteNombre: t.cliente?.razonSocial ?? null,
    clienteFolio: t.cliente?.folio ?? null,
    clienteTipo: t.cliente?.tipo ?? null,
    importadorNombre: t.importador?.razonSocial ?? null,
    numeroPedimento: t.numeroPedimento,
    semaforo: t.semaforo,
    estado: estadoOperacion(ctx),
    situacion: situacionOperacion(pasos, ctx),
    fase,
    faseNombre: FASES[t.tipoOperacion][fase - 1],
    avance: avance(pasos),
    estadosPasos: estados,
    proximoPaso: proximoPaso(pasos.filter((p) => p.estado !== 'NO_APLICA').map((p) => ({ ...p, nombre: nombres.get(p.clave) ?? p.clave })), { ...ctx, estados }),
    documentosRechazados: t.documentos.filter((d) => d.estado === 'RECHAZADO').length,
    contenedores: t.contenedores.map((c) => c.numeroContenedor),
    creadaEn: t.createdAt.toISOString(),
    cerradaEn: iso(t.cerradaEn),
  };
}

/** Todas las operaciones, más recientes primero, listas para la bandeja y el Home. */
export async function dalListarOperaciones(): Promise<OperacionResumen[]> {
  const [traficos, reqImpo, reqExpo] = await Promise.all([
    prisma.trafico.findMany({ include: incluirResumen, orderBy: { createdAt: 'desc' } }),
    dalRequisitosDocumentos('IMPO'),
    dalRequisitosDocumentos('EXPO'),
  ]);
  return traficos.map((t) => aResumen(t, t.tipoOperacion === 'IMPO' ? reqImpo : reqExpo));
}

const incluirDetalle = {
  cliente: true,
  importador: true,
  ejecutivo: { select: { id: true, nombre: true } },
  contenedores: { orderBy: { createdAt: 'asc' } },
  pasos: {
    include: {
      paso: true,
      proveedor: { select: { id: true, razonSocial: true } },
      responsable: { select: { nombre: true } },
    },
  },
  documentos: {
    include: { subidoPor: { select: { nombre: true } }, revisadoPor: { select: { nombre: true } } },
  },
  eventos: { include: { usuario: { select: { nombre: true } } }, orderBy: { createdAt: 'desc' } },
  cargos: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.TraficoInclude;

const aCliente = (c: Prisma.ClienteGetPayload<object> | null) =>
  c
    ? {
        id: c.id,
        folio: c.folio,
        razonSocial: c.razonSocial,
        rfc: c.rfc,
        tipo: c.tipo,
        encargoConferido: c.encargoConferido,
        fechaVigenciaEncargo: iso(c.fechaVigenciaEncargo),
        padronImportadores: c.padronImportadores,
      }
    : null;

/** Detalle completo de una operación. Devuelve null si no existe. */
export async function dalObtenerOperacion(id: string): Promise<OperacionDetalle | null> {
  const [t, agencia] = await Promise.all([
    prisma.trafico.findUnique({ where: { id }, include: incluirDetalle }),
    prisma.configuracionAgencia.findUnique({ where: { id: 1 } }),
  ]);
  if (!t) return null;

  const requisitos = await dalRequisitosDocumentos(t.tipoOperacion);
  const tipo = t.tipoOperacion;
  const docsOk = docsObligatoriosOk(t.documentos, requisitos);
  const pasos = pasosResumen(t);
  const ctx: ContextoOperacion & { cerrada: boolean } = {
    tipo,
    tieneCliente: t.clienteId != null,
    tieneImportador: t.importadorId != null,
    documentosObligatoriosAprobados: docsOk,
    estados: Object.fromEntries(pasos.map((p) => [p.clave, p.estado])),
    cerrada: t.cerradaEn != null,
  };
  const fase = faseActual(pasos, ctx);
  const ordenDe = (p: (typeof t.pasos)[number]) => (tipo === 'EXPO' ? p.paso.ordenExpo : null) ?? p.paso.orden;

  return {
    id: t.id,
    folio: t.referenciaAutomatica,
    folioManual: t.folioManual,
    tipo,
    medio: t.medioTransporte,
    aduana: t.aduana,
    eta: iso(t.eta),
    etd: iso(t.etd),
    clavePedimento: t.clavePedimento,
    numeroPedimento: t.numeroPedimento,
    blGuia: t.blGuia,
    naviera: t.naviera,
    puertoOrigen: t.puertoOrigen,
    incoterm: t.incoterm,
    valorFactura: num(t.valorFactura),
    monedaFactura: t.monedaFactura,
    vendedorExtranjero: t.vendedorExtranjero,
    fracciones: t.fracciones,
    semaforo: t.semaforo,
    ejecutivo: t.ejecutivo?.nombre ?? null,
    cerradaEn: iso(t.cerradaEn),
    creadaEn: t.createdAt.toISOString(),
    cliente: aCliente(t.cliente),
    importador: aCliente(t.importador),
    estado: estadoOperacion(ctx),
    situacion: situacionOperacion(pasos, ctx),
    fase,
    fases: [...FASES[tipo]],
    avance: avance(pasos),
    documentosObligatoriosAprobados: docsOk,
    contenedores: t.contenedores.map((c) => ({ id: c.id, numero: c.numeroContenedor, tipo: c.tipoContenedor })),
    pasos: t.pasos
      .map((p) => ({
        id: p.id,
        clave: p.paso.clave,
        nombre: p.paso.nombre,
        descripcion: p.paso.descripcion,
        fase: faseDelPaso(p.paso, tipo),
        orden: ordenDe(p),
        estado: p.estado,
        fechaInicio: iso(p.fechaInicio),
        fechaFin: iso(p.fechaFin),
        tiempoInvertido: p.tiempoInvertido,
        slaHoras: p.paso.slaHoras,
        esServicio: p.paso.esServicio,
        proveedor: p.proveedor,
        costo: num(p.costo),
        responsable: p.responsable?.nombre ?? null,
        bloqueo: p.estado === 'PENDIENTE' ? motivoBloqueo(p.paso.clave, ctx) : null,
      }))
      .sort((a, b) => a.fase - b.fase || a.orden - b.orden),
    documentos: t.documentos
      .map((d) => {
        const conf = requisitos.get(d.tipo);
        return {
          id: d.id,
          tipo: d.tipo,
          nombre: conf?.nombre ?? d.tipo,
          descripcion: conf?.descripcion ?? null,
          requisito: conf?.requisito ?? RequisitoDocumento.SI_APLICA,
          estado: d.estado,
          url: d.url,
          nombreArchivo: d.nombreArchivo,
          motivoRechazo: d.motivoRechazo,
          subidoPor: d.subidoPor?.nombre ?? null,
          subidoEn: iso(d.subidoEn),
          revisadoPor: d.revisadoPor?.nombre ?? null,
          revisadoEn: iso(d.revisadoEn),
        };
      })
      .sort((a, b) => Number(b.requisito === 'OBLIGATORIO') - Number(a.requisito === 'OBLIGATORIO')),
    eventos: t.eventos.map((e) => ({
      id: e.id,
      fecha: e.createdAt.toISOString(),
      usuario: e.usuario?.nombre ?? 'Sistema',
      tipo: e.tipo,
      descripcion: e.descripcion,
      antes: e.valorAnterior,
      despues: e.valorNuevo,
    })),
    cargos: t.cargos.map((c) => ({ id: c.id, tipo: c.tipo, concepto: c.concepto, monto: Number(c.monto), moneda: c.moneda })),
    agencia: {
      honorariosBase: num(agencia?.honorariosBase) ?? 0,
      ivaHonorarios: num(agencia?.ivaHonorarios) ?? 0.16,
    },
  };
}

/** Clientes para elegir en una operación, con los subclientes de cada forwarder. */
export async function dalOpcionesClientes(): Promise<OpcionCliente[]> {
  const clientes = await prisma.cliente.findMany({
    orderBy: { razonSocial: 'asc' },
    select: { id: true, folio: true, razonSocial: true, rfc: true, tipo: true, clientePadreId: true, encargoConferido: true, fechaVigenciaEncargo: true, padronImportadores: true, estado: true },
  });
  return clientes.map(({ estado, ...c }) => ({ ...c, activo: estado === 'ACTIVO', fechaVigenciaEncargo: iso(c.fechaVigenciaEncargo) }));
}

/** Catálogos para crear o editar operaciones. */
export async function dalCatalogosOperacion() {
  const [aduanas, claves, documentos, agencia, siguienteFolio] = await Promise.all([
    prisma.aduana.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } }),
    prisma.clavePedimento.findMany({ where: { activa: true }, orderBy: { clave: 'asc' } }),
    prisma.documentoConfig.findMany({ orderBy: { tipo: 'asc' } }),
    prisma.configuracionAgencia.findUnique({ where: { id: 1 }, select: { patente: true } }),
    verSiguienteFolio(PREFIJO_FOLIO.OPERACION),
  ]);
  return {
    aduanas: aduanas.map((a) => ({ clave: a.clave, nombre: a.nombre })),
    claves,
    documentos: documentos.map((d) => ({ tipo: d.tipo, nombre: d.nombre, impo: d.requisitoImpo !== 'NO_APLICA', expo: d.requisitoExpo !== 'NO_APLICA' })),
    patente: agencia?.patente ?? null,
    siguienteFolio,
  };
}
