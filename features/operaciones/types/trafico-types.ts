import type { Prisma, TipoOperacion } from "@prisma/client";

export type OperationTabId = "resumen" | "documentacion" | "seguimiento" | "bitacora";

export type OperationStageState = "pendiente" | "en-proceso" | "completado";

export type OperationGlobalStatus = "en-proceso" | "detenido" | "finalizado";

export type OperationDocumentKey =
  | "FACTURA"
  | "BL"
  | "PL"
  | "CO"
  | "PERMISOS"
  | "CM"
  | "HT"
  | "HS"
  | "FOTOS"
  | "OTROS";

export type OperationLayoutData = Prisma.TraficoGetPayload<{
  include: {
    cliente: true;
    pasos: {
      include: {
        paso: true;
      };
      orderBy: {
        createdAt: "asc";
      };
    };
    documento: true;
    contenedores: true;
  };
}>;

export interface OperationClientOption {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
}

export type ClientOption = OperationClientOption;

export interface OperationStageView {
  id: string;
  pasoId: string;
  nombre: string;
  estado: OperationStageState;
  fechaInicio: string | null;
  fechaFin: string | null;
  tiempoInvertido: number | null;
}

export interface OperationDocumentRow {
  id: string;
  key: OperationDocumentKey;
  nombre: string;
  fechaSubida: string | null;
  subidoPor: string;
  url: string | null;
  validado: boolean;
}

export interface OperationAuditItem {
  id: string;
  actor: string;
  accion: string;
  fecha: string;
  valorAnterior?: string;
  valorNuevo?: string;
}

export interface OperationSummaryData {
  aduana: string;
  tipoOperacion: TipoOperacion;
  eta: string | null;
  rfc: string;
  proximoPaso: string;
  alertasPendientes: string[];
}

export const tabs: Array<{ id: OperationTabId; label: string }> = [
  { id: "resumen", label: "Detalles del Embarque" },
  { id: "documentacion", label: "Documentación" },
  { id: "seguimiento", label: "Seguimiento y Etapas" },
  { id: "bitacora", label: "Bitácora" },
];

export const stageLabels: Record<OperationStageState, string> = {
  pendiente: "Pendiente",
  "en-proceso": "En proceso",
  completado: "Completado",
};

export const stageStyles: Record<OperationStageState, string> = {
  pendiente: "bg-slate-50 text-slate-600 border border-slate-200",
  "en-proceso": "bg-amber-50 text-amber-700 border border-amber-200",
  completado: "bg-green-50 text-green-700 border border-green-200",
};

export const documentLabels: Record<OperationDocumentKey, string> = {
  FACTURA: "Factura",
  BL: "BL",
  PL: "PL",
  CO: "CO",
  PERMISOS: "Permisos",
  CM: "CM",
  HT: "HT",
  HS: "HS",
  FOTOS: "Fotos",
  OTROS: "Otros",
};

export const documentChecklistByOperacion: Record<TipoOperacion, OperationDocumentKey[]> = {
  IMPO: ["FACTURA", "BL", "PL", "CO", "PERMISOS", "CM", "HT"],
  EXPO: ["FACTURA", "PL", "HS", "FOTOS", "OTROS"],
};
