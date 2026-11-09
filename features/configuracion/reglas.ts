import type { HitoOperativo } from '@prisma/client';

/** Pasos que sostienen el proceso (candados, pedimento y cierre). No se pueden desactivar. */
export const PASOS_ESENCIALES: HitoOperativo[] = [
  'CLASIFICACION',
  'DESPACHO_ADUANERO',
  'PAGO_CONTRIBUCIONES',
  'MODULACION',
  'CUENTA_GASTOS',
];
