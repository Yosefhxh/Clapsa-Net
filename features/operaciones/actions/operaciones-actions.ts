'use server';

import { revalidatePath } from 'next/cache';
import { MedioTransporte, TipoOperacion } from '@prisma/client';
import { z } from 'zod';
import { requerirUsuario } from '@/shared/auth/session';
import { ejecutar, ErrorNegocio, type Resultado } from '@/shared/lib/resultado';
import type { AccionPaso } from '../domain/proceso';
import * as servicio from '../servicio/operaciones-servicio';

const textoOpcional = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const fechaOpcional = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Fecha no válida.' });
      return z.NEVER;
    }
    return d;
  });

function validar<T>(esquema: z.ZodType<T>, datos: unknown): T {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new ErrorNegocio(r.error.issues[0]?.message ?? 'Revisa los datos capturados.');
  return r.data;
}

function refrescar(traficoId?: string) {
  revalidatePath('/operaciones');
  revalidatePath('/');
  if (traficoId) revalidatePath(`/operaciones/${traficoId}`);
}

const esquemaNueva = z.object({
  tipo: z.enum(TipoOperacion, { message: 'Elige el tipo de operación.' }),
  medio: z.enum(MedioTransporte, { message: 'Elige el medio de transporte.' }),
  aduana: z.string().trim().min(1, 'Elige la aduana.'),
  clavePedimento: textoOpcional,
  eta: fechaOpcional,
  folioManual: textoOpcional,
  clienteId: z.number().int().positive().nullable(),
  importadorId: z.number().int().positive().nullable(),
});

export async function crearOperacionAction(datos: z.input<typeof esquemaNueva>): Promise<Resultado<{ id: string }>> {
  return ejecutar('crearOperacion', async () => {
    const usuario = await requerirUsuario('operaciones.operar');
    const id = await servicio.crearOperacion(validar(esquemaNueva, datos), usuario);
    refrescar();
    return { id };
  }, 'Operación creada.');
}

export async function asignarClienteAction(traficoId: string, clienteId: number, importadorId: number | null): Promise<Resultado> {
  return ejecutar('asignarCliente', async () => {
    const usuario = await requerirUsuario('operaciones.operar');
    await servicio.asignarCliente(traficoId, clienteId, importadorId, usuario);
    refrescar(traficoId);
    return undefined;
  }, 'Asignación guardada.');
}

const ACCIONES: AccionPaso[] = ['INICIAR', 'COMPLETAR', 'NO_APLICA', 'ACTIVAR', 'REABRIR', 'MODULAR_VERDE', 'MODULAR_ROJO', 'LIBERAR'];

export async function cambiarPasoAction(
  traficoId: string,
  traficoPasoId: string,
  accion: AccionPaso,
  extra: { numeroPedimento?: string } = {},
): Promise<Resultado> {
  return ejecutar('cambiarPaso', async () => {
    const usuario = await requerirUsuario();
    if (!ACCIONES.includes(accion)) throw new ErrorNegocio('Acción no válida.');
    await servicio.cambiarEstadoPaso(traficoPasoId, accion, usuario, extra);
    refrescar(traficoId);
    return undefined;
  });
}

export async function subirDocumentoAction(traficoId: string, documentoId: string, formData: FormData): Promise<Resultado> {
  return ejecutar('subirDocumento', async () => {
    const usuario = await requerirUsuario('documentos.revisar');
    await servicio.subirDocumento(documentoId, formData.get('file'), usuario);
    refrescar(traficoId);
    return undefined;
  }, 'Documento subido. Queda por revisar.');
}

export async function revisarDocumentoAction(traficoId: string, documentoId: string, aprobar: boolean, motivo: string | null): Promise<Resultado> {
  return ejecutar('revisarDocumento', async () => {
    const usuario = await requerirUsuario('documentos.revisar');
    await servicio.revisarDocumento(documentoId, aprobar, motivo, usuario);
    refrescar(traficoId);
    return undefined;
  }, aprobar ? 'Documento aprobado.' : 'Documento rechazado.');
}

const esquemaDatos = z.object({
  folioManual: textoOpcional,
  eta: fechaOpcional,
  etd: fechaOpcional,
  clavePedimento: textoOpcional,
  blGuia: textoOpcional,
  naviera: textoOpcional,
  puertoOrigen: textoOpcional,
  incoterm: textoOpcional,
  valorFactura: z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((v, ctx) => {
      if (v === '' || v == null) return null;
      const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: 'custom', message: 'El valor de la factura no es válido.' });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    }),
  monedaFactura: z.enum(['USD', 'MXN', 'EUR'], { message: 'Moneda no válida.' }),
  vendedorExtranjero: textoOpcional,
  fracciones: textoOpcional,
});

export async function actualizarDatosAction(traficoId: string, datos: z.input<typeof esquemaDatos>): Promise<Resultado> {
  return ejecutar('actualizarDatos', async () => {
    const usuario = await requerirUsuario('operaciones.operar');
    await servicio.actualizarDatosDespacho(traficoId, validar(esquemaDatos, datos), usuario);
    refrescar(traficoId);
    return undefined;
  }, 'Datos guardados.');
}

export async function agregarContenedorAction(traficoId: string, numero: string, tipo: string | null): Promise<Resultado> {
  return ejecutar('agregarContenedor', async () => {
    const usuario = await requerirUsuario('operaciones.operar');
    await servicio.agregarContenedor(traficoId, numero, tipo?.trim() || null, usuario);
    refrescar(traficoId);
    return undefined;
  }, 'Contenedor agregado.');
}

export async function quitarContenedorAction(traficoId: string, contenedorId: string): Promise<Resultado> {
  return ejecutar('quitarContenedor', async () => {
    const usuario = await requerirUsuario('operaciones.operar');
    await servicio.quitarContenedor(contenedorId, usuario);
    refrescar(traficoId);
    return undefined;
  }, 'Contenedor quitado.');
}

export async function asignarProveedorAction(traficoId: string, traficoPasoId: string, proveedorId: number | null, costo: number | null): Promise<Resultado> {
  return ejecutar('asignarProveedor', async () => {
    const usuario = await requerirUsuario('operaciones.operar');
    await servicio.asignarProveedorPaso(traficoPasoId, proveedorId, costo, usuario);
    refrescar(traficoId);
    return undefined;
  }, proveedorId == null ? 'Proveedor quitado.' : 'Proveedor asignado.');
}

const esquemaCargo = z.object({
  tipo: z.enum(['CONTRIBUCION', 'HONORARIO', 'OTRO'], { message: 'Elige el tipo de cargo.' }),
  concepto: z.string().trim().min(3, 'Escribe el concepto del cargo.').max(120),
  monto: z.coerce.number({ message: 'El importe no es válido.' }).positive('El importe debe ser mayor a cero.'),
  moneda: z.enum(['MXN', 'USD'], { message: 'Moneda no válida.' }),
});

export async function agregarCargoAction(traficoId: string, datos: z.input<typeof esquemaCargo>): Promise<Resultado> {
  return ejecutar('agregarCargo', async () => {
    const usuario = await requerirUsuario('cuenta.emitir');
    await servicio.agregarCargo(traficoId, validar(esquemaCargo, datos), usuario);
    refrescar(traficoId);
    return undefined;
  }, 'Cargo agregado.');
}

export async function eliminarCargoAction(traficoId: string, cargoId: string): Promise<Resultado> {
  return ejecutar('eliminarCargo', async () => {
    const usuario = await requerirUsuario('cuenta.emitir');
    await servicio.eliminarCargo(cargoId, usuario);
    refrescar(traficoId);
    return undefined;
  }, 'Cargo eliminado.');
}
