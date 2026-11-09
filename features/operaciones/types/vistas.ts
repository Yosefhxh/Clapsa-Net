import type {
  EstadoDocumento,
  EstadoPaso,
  HitoOperativo,
  MedioTransporte,
  RequisitoDocumento,
  Semaforo,
  TipoCargo,
  TipoCliente,
  TipoDocumento,
  TipoEvento,
  TipoOperacion,
} from '@prisma/client';
import type { EstadoOperacion } from '../domain/proceso';

/** Datos serializables que viajan del servidor a las pantallas. */

export interface Avance {
  completados: number;
  total: number;
  porcentaje: number;
}

export interface OperacionResumen {
  id: string;
  folio: string;
  folioManual: string | null;
  tipo: TipoOperacion;
  medio: MedioTransporte;
  aduana: string;
  eta: string | null;
  clienteNombre: string | null;
  clienteFolio: string | null;
  clienteTipo: TipoCliente | null;
  importadorNombre: string | null;
  numeroPedimento: string | null;
  semaforo: Semaforo | null;
  estado: EstadoOperacion;
  situacion: string;
  fase: number;
  faseNombre: string;
  avance: Avance;
  estadosPasos: Partial<Record<HitoOperativo, EstadoPaso>>;
  documentosRechazados: number;
  contenedores: string[];
  creadaEn: string;
  cerradaEn: string | null;
}

export interface ClienteOperacion {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
  tipo: TipoCliente;
  encargoConferido: boolean;
  fechaVigenciaEncargo: string | null;
  padronImportadores: boolean | null;
}

export interface PasoOperacion {
  id: string;
  clave: HitoOperativo;
  nombre: string;
  descripcion: string | null;
  fase: number;
  orden: number;
  estado: EstadoPaso;
  fechaInicio: string | null;
  fechaFin: string | null;
  tiempoInvertido: number | null;
  slaHoras: number | null;
  esServicio: boolean;
  proveedor: { id: number; razonSocial: string } | null;
  costo: number | null;
  responsable: string | null;
  bloqueo: string | null;
}

export interface DocumentoExpediente {
  id: string;
  tipo: TipoDocumento;
  nombre: string;
  descripcion: string | null;
  requisito: RequisitoDocumento;
  estado: EstadoDocumento;
  url: string | null;
  nombreArchivo: string | null;
  motivoRechazo: string | null;
  subidoPor: string | null;
  subidoEn: string | null;
  revisadoPor: string | null;
  revisadoEn: string | null;
}

export interface EventoBitacora {
  id: string;
  fecha: string;
  usuario: string;
  tipo: TipoEvento;
  descripcion: string;
  antes: string | null;
  despues: string | null;
}

export interface CargoCuenta {
  id: string;
  tipo: TipoCargo;
  concepto: string;
  monto: number;
  moneda: string;
}

export interface OperacionDetalle {
  id: string;
  folio: string;
  folioManual: string | null;
  tipo: TipoOperacion;
  medio: MedioTransporte;
  aduana: string;
  eta: string | null;
  etd: string | null;
  clavePedimento: string | null;
  numeroPedimento: string | null;
  blGuia: string | null;
  naviera: string | null;
  puertoOrigen: string | null;
  incoterm: string | null;
  valorFactura: number | null;
  monedaFactura: string;
  vendedorExtranjero: string | null;
  fracciones: string | null;
  semaforo: Semaforo | null;
  ejecutivo: string | null;
  cerradaEn: string | null;
  creadaEn: string;
  cliente: ClienteOperacion | null;
  importador: ClienteOperacion | null;
  estado: EstadoOperacion;
  situacion: string;
  fase: number;
  fases: string[];
  avance: Avance;
  documentosObligatoriosAprobados: boolean;
  contenedores: { id: string; numero: string; tipo: string | null }[];
  pasos: PasoOperacion[];
  documentos: DocumentoExpediente[];
  eventos: EventoBitacora[];
  cargos: CargoCuenta[];
  agencia: { honorariosBase: number; ivaHonorarios: number };
}

export interface OpcionCliente {
  id: number;
  folio: string;
  razonSocial: string;
  rfc: string;
  tipo: TipoCliente;
  clientePadreId: number | null;
  encargoConferido: boolean;
  fechaVigenciaEncargo: string | null;
  padronImportadores: boolean | null;
}

export const ETIQUETA_MEDIO: Record<MedioTransporte, string> = {
  MARITIMO: 'Marítimo',
  AEREO: 'Aéreo',
  TERRESTRE: 'Terrestre',
  FERROVIARIO: 'Ferroviario',
};

export const ETIQUETA_ESTADO_PASO: Record<EstadoPaso, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  RECONOCIMIENTO: 'En reconocimiento',
  COMPLETADO: 'Completado',
  NO_APLICA: 'No aplica',
};

export const ETIQUETA_ESTADO_DOCUMENTO: Record<EstadoDocumento, string> = {
  PENDIENTE: 'Pendiente',
  POR_REVISAR: 'Por revisar',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};
