// Public API: features/clientes

// Components
export { ClientesManagementPage } from "./components/ClientesManagementPage";
export { ClientesModal } from "./components/ClientesModal";
export { ClientesTable } from "./components/ClientesTable";
export { ClientesSearchBar } from "./components/ClientesSearchBar";
export { ClientesPageHeader } from "./components/ClientesPageHeader";
export { ClientesErrorAlert } from "./components/ClientesErrorAlert";

// Actions
export {
  registrarCliente,
  actualizarCliente,
  obtenerClientes,
  eliminarCliente,
} from "./actions/clientes-actions";

// Types
export * from "./types/clientes-types";

// Utils
export {
  construirDomicilio,
  descomponerDomicilio,
  obtenerEstadoDomicilio,
} from "./utils/clientes-utils";

