import type { TipoProveedor } from '@prisma/client';

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
