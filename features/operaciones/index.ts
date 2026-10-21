// Public API: features/operaciones

// Components
export { OperationLayout } from "./components/OperationLayout";
export { ChecklistSection } from "./components/ChecklistSection";
export { DespachoAduanalHeader } from "./components/DespachoAduanalHeader";
export { FolioHeader } from "./components/FolioHeader";
export { HistorialWidget } from "./components/HistorialWidget";
export { MasterDataSection } from "./components/MasterDataSection";
export { ProgressWidget } from "./components/ProgressWidget";
export { SearchBar } from "./components/SearchBar";
export { WorkflowTable } from "./components/WorkflowTable";
export { ContainerManager } from "./components/ContainerManager";
export { ExpedienteChecklistUploader } from "./components/ExpedienteChecklistUploader";
export { TimeDashboard } from "./components/TimeDashboard";

// Actions
export {
  obtenerClientesOperacion,
  obtenerOperacionDespacho,
  asignarClienteDespacho,
  actualizarEstadoEtapaDespacho,
  subirDocumentoOperacion,
  validarDocumentoOperacion,
} from "./actions/operaciones-actions";
export type { DespachoActionResult } from "./actions/operaciones-actions";

// Formatters & Helpers
export {
  construirBitacoraOperacion,
  construirDocumentRows,
  construirResumenOperacion,
  construirStageRows,
} from "./utils/despacho-formatters";
export {
  generarFolio,
  crearEstadoInicial,
} from "./utils/despacho-storage";

// Domain Types & Contracts
export * from "./types";

