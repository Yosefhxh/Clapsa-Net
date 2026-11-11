// Public API: features/operaciones (seguro para cliente y servidor).
// Las consultas a BD se importan directo desde ./dal y ./servicio, solo en el servidor.

export { OperacionesVista } from "./components/OperacionesVista";
export { OperacionDetalleVista } from "./components/detalle/OperacionDetalleVista";
export * from "./types/vistas";
export * from "./domain/proceso";
