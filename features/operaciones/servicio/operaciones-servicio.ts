import 'server-only';

import {
  EstadoDocumento,
  EstadoPaso,
  MedioTransporte,
  Prisma,
  RequisitoDocumento,
  Semaforo,
  TipoCliente,
  TipoEvento,
  TipoOperacion,
  type HitoOperativo,
  type TipoDocumento,
} from '@prisma/client';
import prisma from '@/shared/lib/prisma';
import { tienePermiso, type Permiso } from '@/shared/auth/permisos';
import type { UsuarioSesion } from '@/shared/auth/session-types';
import { ErrorAutorizacion } from '@/shared/auth/session';
import { ErrorNegocio } from '@/shared/lib/resultado';
import { guardarArchivo, validarPdf } from '@/shared/lib/almacenamiento';
import { generarFolio, PREFIJO_FOLIO } from '@/shared/utils/folios';
import { normalizarContenedor, normalizarPedimento } from '@/shared/utils/validaciones';
import {
  motivoBloqueo,
  pasoAplica,
  pasoAplicaAlMedio,
  siguienteEstado,
  type AccionPaso,
  type ContextoOperacion,
} from '../domain/proceso';
import { ETIQUETA_ESTADO_DOCUMENTO, ETIQUETA_ESTADO_PASO } from '../types/vistas';

type Tx = Prisma.TransactionClient;

function exigir(usuario: UsuarioSesion, permiso: Permiso) {
  if (!tienePermiso(usuario.tipoUsuario, permiso)) throw new ErrorAutorizacion();
}

async function registrarEvento(
  tx: Tx,
  traficoId: string,
  usuarioId: number | null,
  tipo: TipoEvento,
  descripcion: string,
  antes?: string | null,
  despues?: string | null,
) {
  await tx.eventoOperacion.create({
    data: { traficoId, usuarioId, tipo, descripcion, valorAnterior: antes ?? null, valorNuevo: despues ?? null },
  });
}

/**
 * Valida la pareja cliente/importador:
 * - Cliente directo: el importador es el mismo cliente.
 * - Forwarder: el importador es obligatorio, debe ser un cliente directo y distinto del forwarder.
 */
async function resolverClienteImportador(
  db: Tx | typeof prisma,
  clienteId: number,
  importadorId: number | null,
  actual: { clienteId: number | null; importadorId: number | null } = { clienteId: null, importadorId: null },
) {
  const cliente = await db.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new ErrorNegocio('El cliente ya no existe.');
  // Un cliente dado de baja no se puede asignar de nuevo (sí se conserva donde ya estaba).
  if (cliente.estado === 'INACTIVO' && cliente.id !== actual.clienteId) throw new ErrorNegocio(`${cliente.razonSocial} está inactivo. Reactívalo en Clientes para usarlo.`);
  if (cliente.tipo === TipoCliente.DIRECTO) return { cliente, importador: cliente };

  if (!importadorId) throw new ErrorNegocio('El cliente es forwarder: elige al importador que va en el pedimento.');
  if (importadorId === clienteId) throw new ErrorNegocio('El importador no puede ser el mismo forwarder.');
  const importador = await db.cliente.findUnique({ where: { id: importadorId } });
  if (!importador) throw new ErrorNegocio('El importador ya no existe.');
  if (importador.estado === 'INACTIVO' && importador.id !== actual.importadorId) throw new ErrorNegocio(`${importador.razonSocial} está inactivo. Reactívalo en Clientes para usarlo.`);
  if (importador.tipo !== TipoCliente.DIRECTO) throw new ErrorNegocio('El importador debe ser un cliente directo.');
  return { cliente, importador };
}

/** Crea los pasos y documentos que le faltan a una operación (operaciones previas a este proceso). */
async function completarEstructura(tx: Tx, traficoId: string, tipo: TipoOperacion, medio: MedioTransporte) {
  const [catalogo, existentes, docsConfig, docsExistentes] = await Promise.all([
    tx.paso.findMany(),
    tx.traficoPaso.findMany({ where: { traficoId }, select: { pasoId: true } }),
    tx.documentoConfig.findMany(),
    tx.documentoOperacion.findMany({ where: { traficoId }, select: { tipo: true } }),
  ]);
  const tienePaso = new Set(existentes.map((p) => p.pasoId));
  const nuevosPasos = catalogo
    .filter((p) => pasoAplica(p, tipo) && !tienePaso.has(p.id))
    .map((p) => ({ traficoId, pasoId: p.id, estado: pasoAplicaAlMedio(p, medio) ? EstadoPaso.PENDIENTE : EstadoPaso.NO_APLICA }));
  if (nuevosPasos.length) await tx.traficoPaso.createMany({ data: nuevosPasos });

  const tieneDoc = new Set(docsExistentes.map((d) => d.tipo));
  const nuevosDocs = docsConfig
    .filter((d) => (tipo === 'IMPO' ? d.requisitoImpo : d.requisitoExpo) !== RequisitoDocumento.NO_APLICA && !tieneDoc.has(d.tipo))
    .map((d) => ({ traficoId, tipo: d.tipo }));
  if (nuevosDocs.length) await tx.documentoOperacion.createMany({ data: nuevosDocs });
}

/** Asegura la estructura de una operación antigua sin modificar lo que ya tiene. */
export async function asegurarEstructuraOperacion(traficoId: string) {
  const t = await prisma.trafico.findUnique({ where: { id: traficoId }, select: { tipoOperacion: true, medioTransporte: true } });
  if (!t) return;
  await prisma.$transaction((tx) => completarEstructura(tx, traficoId, t.tipoOperacion, t.medioTransporte));
}

export interface NuevaOperacion {
  tipo: TipoOperacion;
  medio: MedioTransporte;
  aduana: string;
  clavePedimento: string | null;
  eta: Date | null;
  folioManual: string | null;
  clienteId: number | null;
  importadorId: number | null;
}

export async function crearOperacion(datos: NuevaOperacion, usuario: UsuarioSesion): Promise<string> {
  exigir(usuario, 'operaciones.operar');

  const aduana = await prisma.aduana.findFirst({ where: { nombre: datos.aduana, activa: true } });
  if (!aduana) throw new ErrorNegocio('Elige una aduana activa del catálogo.');
  if (datos.clavePedimento) {
    const clave = await prisma.clavePedimento.findFirst({ where: { clave: datos.clavePedimento, activa: true } });
    if (!clave || !(datos.tipo === 'IMPO' ? clave.aplicaImpo : clave.aplicaExpo)) {
      throw new ErrorNegocio('La clave de pedimento no está activa para este tipo de operación.');
    }
  }

  return prisma.$transaction(async (tx) => {
    const asignacion = datos.clienteId ? await resolverClienteImportador(tx, datos.clienteId, datos.importadorId) : null;
    const folio = await generarFolio(PREFIJO_FOLIO.OPERACION, tx);
    const trafico = await tx.trafico.create({
      data: {
        referenciaAutomatica: folio,
        folioManual: datos.folioManual,
        tipoOperacion: datos.tipo,
        medioTransporte: datos.medio,
        aduana: aduana.nombre,
        clavePedimento: datos.clavePedimento,
        eta: datos.eta,
        clienteId: asignacion?.cliente.id ?? null,
        importadorId: asignacion?.importador.id ?? null,
        ejecutivoId: usuario.id,
      },
    });
    await completarEstructura(tx, trafico.id, datos.tipo, datos.medio);
    await registrarEvento(tx, trafico.id, usuario.id, TipoEvento.OPERACION, `Operación creada con folio ${folio}`);
    if (asignacion) {
      await registrarEvento(tx, trafico.id, usuario.id, TipoEvento.ASIGNACION, descripcionAsignacion(asignacion), 'Sin cliente', asignacion.cliente.folio);
    }
    return trafico.id;
  });
}

function descripcionAsignacion(a: { cliente: { folio: string; tipo: TipoCliente }; importador: { folio: string } }) {
  return a.cliente.tipo === TipoCliente.DIRECTO
    ? `Cliente directo asignado: ${a.cliente.folio}`
    : `Forwarder ${a.cliente.folio} asignado · importador ${a.importador.folio}`;
}

async function cargarOperacionAbierta(tx: Tx, traficoId: string) {
  const t = await tx.trafico.findUnique({ where: { id: traficoId } });
  if (!t) throw new ErrorNegocio('La operación ya no existe.');
  if (t.cerradaEn) throw new ErrorNegocio('La operación está cerrada. Reabre la cuenta de gastos para modificarla.');
  return t;
}

export async function asignarCliente(traficoId: string, clienteId: number, importadorId: number | null, usuario: UsuarioSesion) {
  exigir(usuario, 'operaciones.operar');
  await prisma.$transaction(async (tx) => {
    const t = await cargarOperacionAbierta(tx, traficoId);
    const pedimentoIniciado = await tx.traficoPaso.count({
      where: { traficoId, paso: { clave: 'DESPACHO_ADUANERO' }, estado: { in: [EstadoPaso.EN_PROCESO, EstadoPaso.COMPLETADO] } },
    });
    const asignacion = await resolverClienteImportador(tx, clienteId, importadorId, { clienteId: t.clienteId, importadorId: t.importadorId });
    // El importador va en el pedimento: una vez iniciado ya no puede cambiar.
    if (pedimentoIniciado && t.importadorId && asignacion.importador.id !== t.importadorId) {
      throw new ErrorNegocio('El pedimento ya se inició: no se puede cambiar el importador.');
    }
    const anterior = t.clienteId ? (await tx.cliente.findUnique({ where: { id: t.clienteId }, select: { folio: true } }))?.folio : null;
    await tx.trafico.update({ where: { id: traficoId }, data: { clienteId: asignacion.cliente.id, importadorId: asignacion.importador.id } });
    await registrarEvento(tx, traficoId, usuario.id, TipoEvento.ASIGNACION, descripcionAsignacion(asignacion), anterior ?? 'Sin cliente', asignacion.cliente.folio);
  });
}

const PASOS_DE_PEDIMENTO: HitoOperativo[] = ['DESPACHO_ADUANERO', 'PAGO_CONTRIBUCIONES', 'MODULACION'];

const VERBO: Record<AccionPaso, string> = {
  INICIAR: 'iniciado',
  COMPLETAR: 'completado',
  NO_APLICA: 'marcado como no aplica',
  ACTIVAR: 'activado',
  REABRIR: 'reabierto',
  MODULAR_VERDE: 'modulado en verde',
  MODULAR_ROJO: 'modulado en rojo · reconocimiento',
  LIBERAR: 'liberado tras reconocimiento',
};

export async function cambiarEstadoPaso(
  traficoPasoId: string,
  accion: AccionPaso,
  usuario: UsuarioSesion,
  extra: { numeroPedimento?: string } = {},
) {
  await prisma.$transaction(async (tx) => {
    const tp = await tx.traficoPaso.findUnique({ where: { id: traficoPasoId }, include: { paso: true, trafico: true } });
    if (!tp) throw new ErrorNegocio('El paso ya no existe.');
    const { trafico, paso } = tp;
    const clave = paso.clave;

    // Permisos según el paso y la acción.
    if (accion === 'REABRIR') exigir(usuario, 'pasos.reabrir');
    else if (clave === 'CUENTA_GASTOS') exigir(usuario, 'cuenta.emitir');
    else if (PASOS_DE_PEDIMENTO.includes(clave)) exigir(usuario, 'pedimento.gestionar');
    else exigir(usuario, 'operaciones.operar');

    const reabreCuenta = clave === 'CUENTA_GASTOS' && accion === 'REABRIR';
    if (trafico.cerradaEn && !reabreCuenta) {
      throw new ErrorNegocio('La operación está cerrada. Reabre la cuenta de gastos para modificarla.');
    }

    const nuevo = siguienteEstado(clave, tp.estado, accion);
    if (!nuevo) throw new ErrorNegocio('Esta acción no aplica al estado actual del paso.');

    if (accion === 'INICIAR') {
      const [hermanos, docs, requisitos] = await Promise.all([
        tx.traficoPaso.findMany({ where: { traficoId: trafico.id }, include: { paso: { select: { clave: true } } } }),
        tx.documentoOperacion.findMany({ where: { traficoId: trafico.id }, select: { tipo: true, estado: true } }),
        tx.documentoConfig.findMany(),
      ]);
      const obligatorios = requisitos.filter((r) => (trafico.tipoOperacion === 'IMPO' ? r.requisitoImpo : r.requisitoExpo) === 'OBLIGATORIO');
      const ctx: ContextoOperacion = {
        tipo: trafico.tipoOperacion,
        tieneCliente: trafico.clienteId != null,
        tieneImportador: trafico.importadorId != null,
        documentosObligatoriosAprobados: obligatorios.every((r) => docs.some((d) => d.tipo === r.tipo && d.estado === 'APROBADO')),
        estados: Object.fromEntries(hermanos.map((h) => [h.paso.clave, h.estado])),
      };
      const motivo = motivoBloqueo(clave, ctx);
      if (motivo) throw new ErrorNegocio(motivo);
    }

    const ahora = new Date();
    const datosTrafico: Prisma.TraficoUpdateInput = {};

    if (clave === 'DESPACHO_ADUANERO' && accion === 'COMPLETAR') {
      const pedimento = normalizarPedimento(extra.numeroPedimento ?? trafico.numeroPedimento ?? '');
      if (!pedimento) throw new ErrorNegocio('Captura el número de pedimento validado (15 dígitos).');
      datosTrafico.numeroPedimento = pedimento;
    }
    if (accion === 'MODULAR_VERDE') datosTrafico.semaforo = Semaforo.VERDE;
    if (accion === 'MODULAR_ROJO') datosTrafico.semaforo = Semaforo.ROJO;
    if (clave === 'MODULACION' && accion === 'REABRIR') datosTrafico.semaforo = null;

    if (clave === 'CUENTA_GASTOS' && accion === 'COMPLETAR') {
      const abiertos = await tx.traficoPaso.count({
        where: { traficoId: trafico.id, id: { not: tp.id }, estado: { in: [EstadoPaso.EN_PROCESO, EstadoPaso.RECONOCIMIENTO] } },
      });
      if (abiertos) throw new ErrorNegocio(`Hay ${abiertos} paso(s) en proceso. Termínalos antes de emitir la cuenta.`);
      const sinUsar = await tx.traficoPaso.updateMany({
        where: { traficoId: trafico.id, id: { not: tp.id }, estado: EstadoPaso.PENDIENTE },
        data: { estado: EstadoPaso.NO_APLICA },
      });
      if (sinUsar.count) {
        await registrarEvento(tx, trafico.id, usuario.id, TipoEvento.ETAPA, `Al cerrar: ${sinUsar.count} paso(s) sin usar marcados como no aplica`, 'Pendiente', 'No aplica');
      }
      datosTrafico.cerradaEn = ahora;
    }
    if (reabreCuenta) datosTrafico.cerradaEn = null;

    const terminaPaso = nuevo === EstadoPaso.COMPLETADO;
    const fechaInicio = nuevo === EstadoPaso.EN_PROCESO && !tp.fechaInicio ? ahora : nuevo === EstadoPaso.PENDIENTE || nuevo === EstadoPaso.NO_APLICA ? null : tp.fechaInicio;
    const fechaFin = terminaPaso ? ahora : null;
    const inicioReal = fechaInicio ?? ahora;

    // Actualización condicionada al estado leído: si alguien más lo cambió, no se pisa.
    const { count } = await tx.traficoPaso.updateMany({
      where: { id: tp.id, estado: tp.estado },
      data: {
        estado: nuevo,
        fechaInicio,
        fechaFin,
        tiempoInvertido: terminaPaso ? Math.max(0, Math.round((ahora.getTime() - inicioReal.getTime()) / 1000)) : null,
        ...(accion === 'INICIAR' ? { responsableId: usuario.id } : {}),
      },
    });
    if (!count) throw new ErrorNegocio('Otra persona acaba de cambiar este paso. Recarga para ver el estado actual.');

    if (Object.keys(datosTrafico).length) await tx.trafico.update({ where: { id: trafico.id }, data: datosTrafico });
    await registrarEvento(tx, trafico.id, usuario.id, TipoEvento.ETAPA, `${paso.nombre} ${VERBO[accion]}`, ETIQUETA_ESTADO_PASO[tp.estado], ETIQUETA_ESTADO_PASO[nuevo]);
  });
}

export async function subirDocumento(documentoId: string, archivo: unknown, usuario: UsuarioSesion) {
  exigir(usuario, 'documentos.revisar');
  const pdf = validarPdf(archivo);
  const doc = await prisma.documentoOperacion.findUnique({ where: { id: documentoId }, include: { trafico: true } });
  if (!doc) throw new ErrorNegocio('El documento ya no existe.');
  if (doc.trafico.cerradaEn) throw new ErrorNegocio('La operación está cerrada.');

  const url = await guardarArchivo(pdf, `operaciones/${doc.trafico.referenciaAutomatica}`, doc.tipo);
  await prisma.$transaction(async (tx) => {
    await tx.documentoOperacion.update({
      where: { id: documentoId },
      data: {
        estado: EstadoDocumento.POR_REVISAR,
        url,
        nombreArchivo: pdf.name,
        motivoRechazo: null,
        subidoPorId: usuario.id,
        subidoEn: new Date(),
        revisadoPorId: null,
        revisadoEn: null,
      },
    });
    await registrarEvento(tx, doc.traficoId, usuario.id, TipoEvento.DOCUMENTO, `Documento ${doc.tipo} subido: ${pdf.name}`, ETIQUETA_ESTADO_DOCUMENTO[doc.estado], 'Por revisar');
  });
}

export async function revisarDocumento(documentoId: string, aprobar: boolean, motivo: string | null, usuario: UsuarioSesion) {
  exigir(usuario, 'documentos.revisar');
  const motivoLimpio = motivo?.trim() ?? '';
  if (!aprobar && motivoLimpio.length < 3) throw new ErrorNegocio('Escribe el motivo del rechazo.');

  await prisma.$transaction(async (tx) => {
    const doc = await tx.documentoOperacion.findUnique({ where: { id: documentoId }, include: { trafico: { select: { cerradaEn: true } } } });
    if (!doc) throw new ErrorNegocio('El documento ya no existe.');
    if (doc.trafico.cerradaEn) throw new ErrorNegocio('La operación está cerrada.');
    if (doc.estado !== EstadoDocumento.POR_REVISAR) throw new ErrorNegocio('Solo se revisan documentos que ya se subieron.');

    const estado = aprobar ? EstadoDocumento.APROBADO : EstadoDocumento.RECHAZADO;
    await tx.documentoOperacion.update({
      where: { id: documentoId },
      data: { estado, motivoRechazo: aprobar ? null : motivoLimpio, revisadoPorId: usuario.id, revisadoEn: new Date() },
    });
    await registrarEvento(
      tx, doc.traficoId, usuario.id, TipoEvento.DOCUMENTO,
      aprobar ? `Documento ${doc.tipo} aprobado` : `Documento ${doc.tipo} rechazado: ${motivoLimpio}`,
      'Por revisar', ETIQUETA_ESTADO_DOCUMENTO[estado],
    );
  });
}

export interface DatosDespacho {
  folioManual: string | null;
  eta: Date | null;
  etd: Date | null;
  clavePedimento: string | null;
  blGuia: string | null;
  naviera: string | null;
  puertoOrigen: string | null;
  incoterm: string | null;
  valorFactura: number | null;
  monedaFactura: string;
  vendedorExtranjero: string | null;
  fracciones: string | null;
}

const ETIQUETA_CAMPO: Record<keyof DatosDespacho, string> = {
  folioManual: 'Referencia del cliente', eta: 'ETA', etd: 'ETD', clavePedimento: 'Clave de pedimento', blGuia: 'BL / Guía',
  naviera: 'Naviera / Aerolínea', puertoOrigen: 'Puerto de origen', incoterm: 'Incoterm', valorFactura: 'Valor factura',
  monedaFactura: 'Moneda', vendedorExtranjero: 'Vendedor extranjero', fracciones: 'Fracciones',
};

export async function actualizarDatosDespacho(traficoId: string, datos: DatosDespacho, usuario: UsuarioSesion) {
  exigir(usuario, 'operaciones.operar');
  await prisma.$transaction(async (tx) => {
    const t = await cargarOperacionAbierta(tx, traficoId);
    if (datos.clavePedimento) {
      const clave = await tx.clavePedimento.findFirst({ where: { clave: datos.clavePedimento, activa: true } });
      if (!clave) throw new ErrorNegocio('La clave de pedimento no está activa.');
    }
    const cambiados = (Object.keys(ETIQUETA_CAMPO) as (keyof DatosDespacho)[]).filter((k) => {
      const antes = t[k as keyof typeof t];
      const despues = datos[k];
      const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(Number.isNaN(Number(v)) ? v : Number(v)));
      return norm(antes) !== norm(despues);
    });
    if (!cambiados.length) return;
    await tx.trafico.update({ where: { id: traficoId }, data: datos });
    await registrarEvento(tx, traficoId, usuario.id, TipoEvento.OPERACION, `Datos de despacho actualizados: ${cambiados.map((k) => ETIQUETA_CAMPO[k]).join(', ')}`);
  });
}

export async function agregarContenedor(traficoId: string, numero: string, tipo: string | null, usuario: UsuarioSesion) {
  exigir(usuario, 'operaciones.operar');
  const normal = normalizarContenedor(numero);
  if (!normal) throw new ErrorNegocio('El número de contenedor no es válido (4 letras, 6 dígitos y dígito verificador).');
  await prisma.$transaction(async (tx) => {
    await cargarOperacionAbierta(tx, traficoId);
    await tx.contenedor.create({ data: { traficoId, numeroContenedor: normal, tipoContenedor: tipo } });
    await registrarEvento(tx, traficoId, usuario.id, TipoEvento.OPERACION, `Contenedor agregado: ${normal}`);
  });
}

export async function quitarContenedor(contenedorId: string, usuario: UsuarioSesion) {
  exigir(usuario, 'operaciones.operar');
  await prisma.$transaction(async (tx) => {
    const c = await tx.contenedor.findUnique({ where: { id: contenedorId } });
    if (!c) throw new ErrorNegocio('El contenedor ya no existe.');
    await cargarOperacionAbierta(tx, c.traficoId);
    await tx.contenedor.delete({ where: { id: contenedorId } });
    await registrarEvento(tx, c.traficoId, usuario.id, TipoEvento.OPERACION, `Contenedor quitado: ${c.numeroContenedor}`);
  });
}

/**
 * Asigna el proveedor que hará un paso de servicio, con su costo para esta operación.
 * Solo se aceptan proveedores que tengan marcado ese servicio y den servicio en la aduana.
 */
export async function asignarProveedorPaso(traficoPasoId: string, proveedorId: number | null, costo: number | null, usuario: UsuarioSesion) {
  exigir(usuario, 'operaciones.operar');
  if (costo != null && (!Number.isFinite(costo) || costo < 0)) throw new ErrorNegocio('El costo no es válido.');
  await prisma.$transaction(async (tx) => {
    const tp = await tx.traficoPaso.findUnique({ where: { id: traficoPasoId }, include: { paso: true, proveedor: true } });
    if (!tp) throw new ErrorNegocio('El paso ya no existe.');
    const t = await cargarOperacionAbierta(tx, tp.traficoId);
    if (!tp.paso.esServicio) throw new ErrorNegocio('Este paso lo hace la agencia; no lleva proveedor.');

    if (proveedorId == null) {
      await tx.traficoPaso.update({ where: { id: tp.id }, data: { proveedorId: null, costo: null } });
      await registrarEvento(tx, t.id, usuario.id, TipoEvento.COSTO, `Proveedor quitado de ${tp.paso.nombre}`, tp.proveedor?.razonSocial ?? null, 'Sin proveedor');
      return;
    }

    const servicio = await tx.proveedorServicio.findUnique({
      where: { proveedorId_pasoId: { proveedorId, pasoId: tp.pasoId } },
      include: { proveedor: true },
    });
    if (!servicio) throw new ErrorNegocio(`Ese proveedor no tiene registrado el servicio “${tp.paso.nombre}”.`);
    if (servicio.proveedor.aduanas.length && !servicio.proveedor.aduanas.includes(t.aduana)) {
      throw new ErrorNegocio(`Ese proveedor no da servicio en ${t.aduana}.`);
    }
    const costoFinal = costo ?? (servicio.tarifaBase == null ? null : Number(servicio.tarifaBase));
    await tx.traficoPaso.update({ where: { id: tp.id }, data: { proveedorId, costo: costoFinal } });
    await registrarEvento(
      tx, t.id, usuario.id, TipoEvento.COSTO,
      `Proveedor asignado a ${tp.paso.nombre}: ${servicio.proveedor.razonSocial}`,
      tp.proveedor?.razonSocial ?? 'Sin proveedor',
      costoFinal == null ? 'Sin costo' : `$${costoFinal.toFixed(2)}`,
    );
  });
}

const TIPOS_CARGO = ['CONTRIBUCION', 'HONORARIO', 'OTRO'] as const;

/** Cargos de la cuenta que no vienen de un proveedor: contribuciones, honorarios u otros. */
export async function agregarCargo(
  traficoId: string,
  datos: { tipo: (typeof TIPOS_CARGO)[number]; concepto: string; monto: number; moneda: string },
  usuario: UsuarioSesion,
) {
  exigir(usuario, 'cuenta.emitir');
  const concepto = datos.concepto.trim();
  if (!TIPOS_CARGO.includes(datos.tipo)) throw new ErrorNegocio('Tipo de cargo no válido.');
  if (concepto.length < 3) throw new ErrorNegocio('Escribe el concepto del cargo.');
  if (!Number.isFinite(datos.monto) || datos.monto <= 0) throw new ErrorNegocio('El importe debe ser mayor a cero.');
  await prisma.$transaction(async (tx) => {
    await cargarOperacionAbierta(tx, traficoId);
    await tx.cargoOperacion.create({ data: { traficoId, tipo: datos.tipo, concepto, monto: Math.round(datos.monto * 100) / 100, moneda: datos.moneda } });
    await registrarEvento(tx, traficoId, usuario.id, TipoEvento.COSTO, `Cargo agregado: ${concepto}`, null, `$${datos.monto.toFixed(2)}`);
  });
}

export async function eliminarCargo(cargoId: string, usuario: UsuarioSesion) {
  exigir(usuario, 'cuenta.emitir');
  await prisma.$transaction(async (tx) => {
    const c = await tx.cargoOperacion.findUnique({ where: { id: cargoId } });
    if (!c) throw new ErrorNegocio('El cargo ya no existe.');
    await cargarOperacionAbierta(tx, c.traficoId);
    await tx.cargoOperacion.delete({ where: { id: cargoId } });
    await registrarEvento(tx, c.traficoId, usuario.id, TipoEvento.COSTO, `Cargo eliminado: ${c.concepto}`, `$${Number(c.monto).toFixed(2)}`, null);
  });
}

export type { TipoDocumento };
