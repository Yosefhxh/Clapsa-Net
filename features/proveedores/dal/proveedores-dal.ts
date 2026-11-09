import 'server-only';

import type { HitoOperativo, TipoProveedor } from '@prisma/client';
import prisma from '@/shared/lib/prisma';
import type { ProveedorParaPaso } from '../types';

export interface ProveedorVista {
  id: number;
  razonSocial: string;
  tipoProveedor: TipoProveedor;
  rfc: string;
  correo: string;
  telefono: string;
  direccion: string;
  fuenteAlta: 'MANUAL' | 'CONSTANCIA';
  fechaAlta: string;
  aduanas: string[];
  servicios: { pasoId: string; clave: HitoOperativo; nombre: string; tarifa: number | null }[];
  operacionesActivas: number;
  serviciosEsteAnio: number;
}

/** Proveedores con sus servicios y uso en operaciones. */
export async function dalObtenerProveedores(): Promise<ProveedorVista[]> {
  const inicioAnio = new Date(new Date().getFullYear(), 0, 1);
  const proveedores = await prisma.proveedores.findMany({
    orderBy: { id: 'desc' },
    include: {
      servicios: { include: { paso: { select: { clave: true, nombre: true, orden: true } } } },
      traficoPasos: { select: { createdAt: true, trafico: { select: { cerradaEn: true } } } },
    },
  });
  return proveedores.map((p) => ({
    id: p.id,
    razonSocial: p.razonSocial,
    tipoProveedor: p.tipoProveedor,
    rfc: p.rfc,
    correo: p.correo,
    telefono: p.telefono,
    direccion: p.direccion,
    fuenteAlta: p.fuenteAlta,
    fechaAlta: p.fechaAlta.toISOString(),
    aduanas: p.aduanas,
    servicios: p.servicios
      .sort((a, b) => a.paso.orden - b.paso.orden)
      .map((s) => ({ pasoId: s.pasoId, clave: s.paso.clave, nombre: s.paso.nombre, tarifa: s.tarifaBase == null ? null : Number(s.tarifaBase) })),
    operacionesActivas: p.traficoPasos.filter((tp) => !tp.trafico.cerradaEn).length,
    serviciosEsteAnio: p.traficoPasos.filter((tp) => tp.createdAt >= inicioAnio).length,
  }));
}

/** Pasos que puede hacer un proveedor externo (los servicios que se marcan al registrarlo). */
export async function dalPasosDeServicio() {
  return prisma.paso.findMany({ where: { esServicio: true, activo: true }, orderBy: { orden: 'asc' }, select: { id: true, clave: true, nombre: true } });
}

/** Para asignar proveedor en una operación: por cada paso, quién lo presta y a qué tarifa. */
export async function dalProveedoresPorServicio(): Promise<Partial<Record<HitoOperativo, ProveedorParaPaso[]>>> {
  const servicios = await prisma.proveedorServicio.findMany({
    include: { paso: { select: { clave: true } }, proveedor: { select: { id: true, razonSocial: true, tipoProveedor: true, aduanas: true } } },
    orderBy: { proveedor: { razonSocial: 'asc' } },
  });
  const mapa: Partial<Record<HitoOperativo, ProveedorParaPaso[]>> = {};
  for (const s of servicios) {
    (mapa[s.paso.clave] ??= []).push({
      id: s.proveedor.id,
      razonSocial: s.proveedor.razonSocial,
      tipo: s.proveedor.tipoProveedor,
      aduanas: s.proveedor.aduanas,
      tarifa: s.tarifaBase == null ? null : Number(s.tarifaBase),
    });
  }
  return mapa;
}
