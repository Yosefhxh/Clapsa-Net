import type { HitoOperativo, TipoProveedor } from '@prisma/client';

/** Proveedor que puede hacer un paso, con su tarifa base para ese servicio. */
export interface ProveedorParaPaso {
  id: number;
  razonSocial: string;
  tipo: TipoProveedor;
  aduanas: string[];
  tarifa: number | null;
}

export const ETIQUETA_TIPO_PROVEEDOR: Record<TipoProveedor, string> = {
  LOGISTICA: 'Logística',
  ADUANAL: 'Aduanal',
  GENERALES: 'Generales',
};

/** Paso de servicio que se puede marcar al registrar un proveedor. */
export interface PasoServicio { id: string; clave: HitoOperativo; nombre: string }

/** Servicios que se sugieren (no se marcan solos) según el tipo de proveedor. */
export const SUGERIDOS_PROVEEDOR: Record<TipoProveedor, HitoOperativo[]> = {
  LOGISTICA: ['FLETE_MARITIMO', 'FLETE_AEREO', 'FT_INTERMODAL', 'FT_NACIONAL', 'MANIOBRAS_PORTUARIAS', 'MANIOBRAS_ALMACEN'],
  ADUANAL: ['UVA', 'ALMACENAJE', 'OTRAS'],
  GENERALES: ['OTRAS'],
};

/** Clase de color por categoría (pill y acento). */
export const CLASE_TIPO_PROVEEDOR: Record<TipoProveedor, string> = {
  LOGISTICA: 'logistica',
  ADUANAL: 'aduanal',
  GENERALES: 'generales',
};
