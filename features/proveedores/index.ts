// Public API: features/proveedores

export { registrarProveedor, actualizarProveedor, cambiarEstadoProveedores, eliminarProveedorAction } from "./actions/proveedores";
export type { DatosProveedor } from "./actions/proveedores";
export { ProveedoresVista } from "./components/ProveedoresVista";
export * from "./types";
