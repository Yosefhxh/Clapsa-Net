'use server';

import { EstadoUsuario, TipoUsuario } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hashearPassword, validarPasswordNueva, verificarPassword } from '@/shared/auth/password';
import {
  cerrarSesion,
  cerrarSesionesDeUsuario,
  crearSesion,
  requerirUsuario,
} from '@/shared/auth/session';
import { ErrorNegocio, mensajeDeError } from '@/shared/lib/resultado';
import {
  dalActualizarUsuario,
  dalBuscarUsuarioPorCorreo,
  dalContarAdminsActivos,
  dalCrearUsuario,
  dalEliminarUsuario,
  dalObtenerUsuarioPorId,
  dalObtenerUsuarios,
} from '../dal/usuarios-dal';

export interface UsuarioFormData {
  nombre: string;
  correo: string;
  tipoUsuario: TipoUsuario;
  estado: 'activo' | 'inactivo';
  password?: string;
}

const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function iniciarSesionAction(correo: string, password: string) {
  try {
    const correoNormalizado = normalizarCorreo(correo);
    const usuario = correoNormalizado ? await dalBuscarUsuarioPorCorreo(correoNormalizado) : null;
    // Mismo mensaje para correo y contraseña: no revela qué cuentas existen.
    const credencialesInvalidas = { success: false as const, error: 'Correo o contraseña incorrectos' };

    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO) return credencialesInvalidas;

    const { valida, requiereActualizar } = await verificarPassword(password, usuario.passwordHash);
    if (!valida) return credencialesInvalidas;

    if (requiereActualizar) {
      await dalActualizarUsuario(usuario.id, { passwordHash: await hashearPassword(password) });
    }

    await crearSesion(usuario.id);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: mensajeDeError(error, 'iniciarSesion') };
  }
}

export async function cerrarSesionAction() {
  await cerrarSesion();
  redirect('/login');
}

export async function gestionarUsuario(datos: UsuarioFormData, id?: number) {
  try {
    const actual = await requerirUsuario('usuarios.gestionar');
    const nombre = datos.nombre.trim();
    const correo = normalizarCorreo(datos.correo);
    const estado = datos.estado === 'activo' ? EstadoUsuario.ACTIVO : EstadoUsuario.INACTIVO;
    const password = datos.password?.trim() ?? '';

    if (!nombre) throw new ErrorNegocio('El nombre es obligatorio.');
    if (!CORREO_VALIDO.test(correo)) throw new ErrorNegocio('El correo no es válido.');
    if (!Object.values(TipoUsuario).includes(datos.tipoUsuario)) throw new ErrorNegocio('El rol no es válido.');
    if (!id && !password) throw new ErrorNegocio('La contraseña es obligatoria.');
    if (password) {
      const errorPassword = validarPasswordNueva(password);
      if (errorPassword) throw new ErrorNegocio(errorPassword);
    }

    const passwordHash = password ? await hashearPassword(password) : undefined;

    if (id) {
      const existente = await dalObtenerUsuarioPorId(id);
      if (!existente) throw new ErrorNegocio('El usuario ya no existe.');

      const dejaDeSerAdminActivo =
        existente.tipoUsuario === TipoUsuario.ADMIN &&
        existente.estado === EstadoUsuario.ACTIVO &&
        (datos.tipoUsuario !== TipoUsuario.ADMIN || estado !== EstadoUsuario.ACTIVO);
      if (dejaDeSerAdminActivo && (await dalContarAdminsActivos()) <= 1) {
        throw new ErrorNegocio('Debe quedar al menos un administrador activo.');
      }
      if (id === actual.id && estado !== EstadoUsuario.ACTIVO) {
        throw new ErrorNegocio('No puedes desactivar tu propio usuario.');
      }

      await dalActualizarUsuario(id, {
        nombre,
        correo,
        tipoUsuario: datos.tipoUsuario,
        estado,
        ...(passwordHash && { passwordHash }),
      });
      if (estado !== EstadoUsuario.ACTIVO || passwordHash) await cerrarSesionesDeUsuario(id);
    } else {
      await dalCrearUsuario({ nombre, correo, tipoUsuario: datos.tipoUsuario, estado, passwordHash: passwordHash! });
    }

    revalidatePath('/usuarios');
    return { success: true };
  } catch (error) {
    return { success: false, error: mensajeDeError(error, 'gestionarUsuario') };
  }
}

export async function obtenerUsuarios() {
  await requerirUsuario('usuarios.gestionar');
  return dalObtenerUsuarios();
}

export async function eliminarUsuarioAction(id: number) {
  try {
    const actual = await requerirUsuario('usuarios.gestionar');
    if (id === actual.id) throw new ErrorNegocio('No puedes eliminar tu propio usuario.');

    const existente = await dalObtenerUsuarioPorId(id);
    if (!existente) throw new ErrorNegocio('El usuario ya no existe.');
    if (existente.tipoUsuario === TipoUsuario.ADMIN && existente.estado === EstadoUsuario.ACTIVO && (await dalContarAdminsActivos()) <= 1) {
      throw new ErrorNegocio('Debe quedar al menos un administrador activo.');
    }

    await dalEliminarUsuario(id);
    revalidatePath('/usuarios');
    return { success: true };
  } catch (error) {
    return { success: false, error: mensajeDeError(error, 'eliminarUsuario') };
  }
}
