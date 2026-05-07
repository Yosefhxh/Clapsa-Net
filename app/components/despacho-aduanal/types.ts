export type TipoCliente = "DIRECTO" | "FORWARDER";
export type TipoOperacion = "IMPO" | "EXPO";
export type PasoEstado = "completado" | "en-proceso" | "pendiente";

export interface PasoDespacho {
  id: number;
  etapa: string;
  fecha: string;
  estado: PasoEstado;
}

export interface HistorialCambio {
  id: number;
  mensaje: string;
  fecha: string;
}

export interface EstadoOperacion {
  folio: string;
  clienteNombre: string;
  clienteTipo: TipoCliente;
  rfc: string;
  aduana: string;
  tipoOperacion: TipoOperacion;
  eta: string;
  etd: string;
}

export const FOLIO_COUNTER_KEY = "clapsa-despacho-folio-counter";
export const STORAGE_KEY = "clapsa-despacho-operacion";

export const aduanas = [
  "Nuevo Laredo",
  "Manzanillo",
  "Veracruz",
  "Altamira",
  "CDMX AICM",
];

export const etapasBase: PasoDespacho[] = [
  { id: 1, etapa: "Previo en Origen", fecha: "-", estado: "pendiente" },
  { id: 2, etapa: "Flete Maritimo", fecha: "-", estado: "pendiente" },
  { id: 3, etapa: "Flete Aereo", fecha: "-", estado: "pendiente" },
  { id: 4, etapa: "Flete Terrestre Nacional", fecha: "-", estado: "pendiente" },
  { id: 5, etapa: "Despacho Aduanero", fecha: "-", estado: "pendiente" },
  { id: 6, etapa: "Flete Terrestre Internacional", fecha: "-", estado: "pendiente" },
  { id: 7, etapa: "UVA", fecha: "-", estado: "pendiente" },
  { id: 8, etapa: "Almacenaje", fecha: "-", estado: "pendiente" },
  { id: 9, etapa: "Maniobras en Almacen", fecha: "-", estado: "pendiente" },
  { id: 10, etapa: "Maniobras Portuarias", fecha: "-", estado: "pendiente" },
  { id: 11, etapa: "Otros", fecha: "-", estado: "pendiente" },
];

export const checklistPorOperacion: Record<TipoOperacion, string[]> = {
  IMPO: [
    "Factura",
    "BL (Bill of Lading)",
    "Packing List (PL)",
    "Certificado de Origen (CO)",
    "Permisos",
    "Hoja Tecnica",
  ],
  EXPO: ["Hoja de Seguridad (HS)", "Fotos"],
};

export const estadoStyles: Record<PasoEstado, string> = {
  completado: "bg-green-50 text-green-700 border border-green-200",
  "en-proceso": "bg-amber-50 text-amber-700 border border-amber-200",
  pendiente: "bg-slate-50 text-slate-600 border border-slate-200",
};

export const estadoLabel: Record<PasoEstado, string> = {
  completado: "Completado",
  "en-proceso": "En proceso",
  pendiente: "Pendiente",
};
