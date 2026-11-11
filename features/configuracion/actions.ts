'use server';

import { revalidatePath } from 'next/cache';
import { HitoOperativo, RequisitoDocumento, TipoDocumento, TipoUsuario } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/shared/lib/prisma';
import { ErrorAutorizacion, requerirUsuario } from '@/shared/auth/session';
import { esPermiso, PERMISOS, PERMISOS_BASE } from '@/shared/auth/permisos';
import { ejecutar, ErrorNegocio, type Resultado } from '@/shared/lib/resultado';
import { PASOS_ESENCIALES } from './reglas';

function validar<T>(esquema: z.ZodType<T>, datos: unknown): T {
  const r = esquema.safeParse(datos);
  if (!r.success) throw new ErrorNegocio(r.error.issues[0]?.message ?? 'Revisa los datos.');
  return r.data;
}

const refrescar = () => {
  revalidatePath('/configuracion');
  revalidatePath('/operaciones');
  revalidatePath('/');
};

const opcional = z.string().trim().max(200).transform((v) => v || null);

const esquemaAgencia = z.object({
  razonSocial: z.string().trim().min(3, 'La razón social es obligatoria.').max(200),
  rfc: opcional,
  agenteAduanal: opcional,
  patente: z.string().trim().refine((v) => v === '' || /^\d{4}$/.test(v), 'La patente tiene 4 dígitos.').transform((v) => v || null),
  honorariosBase: z.coerce.number({ message: 'Honorarios no válidos.' }).min(0, 'Los honorarios no pueden ser negativos.'),
  ivaHonorarios: z.coerce.number({ message: 'IVA no válido.' }).min(0).max(1, 'El IVA va de 0 a 1 (0.16 = 16%).'),
});

export async function guardarAgenciaAction(datos: z.input<typeof esquemaAgencia>): Promise<Resultado> {
  return ejecutar('guardarAgencia', async () => {
    await requerirUsuario('configuracion.editar');
    const d = validar(esquemaAgencia, datos);
    await prisma.configuracionAgencia.upsert({ where: { id: 1 }, update: d, create: { id: 1, ...d } });
    refrescar();
    return undefined;
  }, 'Datos de la agencia guardados.');
}

const esquemaAduana = z.object({
  clave: z.string().trim().regex(/^\d{2,3}$/, 'La clave de aduana tiene 2 o 3 dígitos.'),
  nombre: z.string().trim().min(3, 'Escribe el nombre de la aduana.').max(80),
});

export async function agregarAduanaAction(datos: z.input<typeof esquemaAduana>): Promise<Resultado> {
  return ejecutar('agregarAduana', async () => {
    await requerirUsuario('configuracion.editar');
    await prisma.aduana.create({ data: validar(esquemaAduana, datos) });
    refrescar();
    return undefined;
  }, 'Aduana agregada.');
}

export async function activarAduanaAction(id: number, activa: boolean): Promise<Resultado> {
  return ejecutar('activarAduana', async () => {
    await requerirUsuario('configuracion.editar');
    await prisma.aduana.update({ where: { id }, data: { activa } });
    refrescar();
    return undefined;
  }, activa ? 'Aduana activada.' : 'Aduana desactivada: ya no aparece en operaciones nuevas.');
}

const esquemaPaso = z.object({
  nombre: z.string().trim().min(2, 'El nombre del paso es obligatorio.').max(60),
  descripcion: opcional,
  slaHoras: z.number().int().min(1, 'El SLA es de al menos 1 hora.').max(2000).nullable(),
  activo: z.boolean(),
});

export async function guardarPasoAction(clave: HitoOperativo, datos: z.input<typeof esquemaPaso>): Promise<Resultado> {
  return ejecutar('guardarPaso', async () => {
    await requerirUsuario('configuracion.editar');
    if (!Object.values(HitoOperativo).includes(clave)) throw new ErrorNegocio('Paso no válido.');
    const d = validar(esquemaPaso, datos);
    if (!d.activo && PASOS_ESENCIALES.includes(clave)) throw new ErrorNegocio('Este paso es parte esencial del proceso y no se puede desactivar.');
    await prisma.paso.update({ where: { clave }, data: d });
    refrescar();
    return undefined;
  }, 'Paso actualizado.');
}

const esquemaDocumento = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(40),
  descripcion: opcional,
  requisitoImpo: z.enum(RequisitoDocumento),
  requisitoExpo: z.enum(RequisitoDocumento),
});

export async function guardarDocumentoAction(tipo: TipoDocumento, datos: z.input<typeof esquemaDocumento>): Promise<Resultado> {
  return ejecutar('guardarDocumento', async () => {
    await requerirUsuario('configuracion.editar');
    if (!Object.values(TipoDocumento).includes(tipo)) throw new ErrorNegocio('Documento no válido.');
    await prisma.documentoConfig.update({ where: { tipo }, data: validar(esquemaDocumento, datos) });
    refrescar();
    return undefined;
  }, 'Documento actualizado. Aplica a operaciones nuevas y a las que aún no lo tienen.');
}

const esquemaClave = z.object({
  clave: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2}$/, 'La clave de pedimento tiene 2 caracteres.'),
  descripcion: z.string().trim().min(3, 'Escribe la descripción.').max(120),
  aplicaImpo: z.boolean(),
  aplicaExpo: z.boolean(),
});

export async function agregarClaveAction(datos: z.input<typeof esquemaClave>): Promise<Resultado> {
  return ejecutar('agregarClave', async () => {
    await requerirUsuario('configuracion.editar');
    const d = validar(esquemaClave, datos);
    if (!d.aplicaImpo && !d.aplicaExpo) throw new ErrorNegocio('Marca si aplica a importación, exportación o ambas.');
    await prisma.clavePedimento.create({ data: d });
    refrescar();
    return undefined;
  }, 'Clave agregada.');
}

export async function activarClaveAction(clave: string, activa: boolean): Promise<Resultado> {
  return ejecutar('activarClave', async () => {
    await requerirUsuario('configuracion.editar');
    await prisma.clavePedimento.update({ where: { clave }, data: { activa } });
    refrescar();
    return undefined;
  }, activa ? 'Clave activada.' : 'Clave desactivada.');
}

export async function activarAlertaAction(clave: string, activa: boolean): Promise<Resultado> {
  return ejecutar('activarAlerta', async () => {
    await requerirUsuario('configuracion.editar');
    await prisma.alertaConfig.update({ where: { clave }, data: { activa } });
    refrescar();
    return undefined;
  }, activa ? 'Alerta activada.' : 'Alerta desactivada.');
}

/**
 * Activa o quita un permiso a un rol. Solo un Administrador puede hacerlo (aunque otro rol tenga
 * "Cambiar la configuración"), para que nadie se dé permisos a sí mismo. El Administrador no se edita.
 */
export async function guardarPermisoRolAction(rol: TipoUsuario, permiso: string, permitido: boolean): Promise<Resultado> {
  return ejecutar('guardarPermisoRol', async () => {
    const usuario = await requerirUsuario('configuracion.editar');
    if (usuario.tipoUsuario !== TipoUsuario.ADMIN) throw new ErrorAutorizacion('Solo un administrador puede cambiar los permisos de los roles.');
    if (!Object.values(TipoUsuario).includes(rol)) throw new ErrorNegocio('Rol no válido.');
    if (rol === TipoUsuario.ADMIN) throw new ErrorNegocio('El administrador siempre conserva todos los permisos.');
    if (!esPermiso(permiso)) throw new ErrorNegocio('Permiso no válido.');
    if (PERMISOS_BASE.includes(permiso)) throw new ErrorNegocio('Este permiso es necesario para entrar al sistema y no se puede quitar.');
    if (typeof permitido !== 'boolean') throw new ErrorNegocio('Valor no válido.');
    await prisma.permisoRol.upsert({
      where: { rol_permiso: { rol, permiso } },
      update: { permitido },
      create: { rol, permiso, permitido },
    });
    revalidatePath('/', 'layout');
    return undefined;
  }, `${permitido ? 'Permiso activado' : 'Permiso quitado'}: ${esPermiso(permiso) ? PERMISOS[permiso].nombre : permiso}.`);
}
