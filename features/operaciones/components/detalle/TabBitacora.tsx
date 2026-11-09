"use client";

import { useMemo } from "react";
import type { TipoEvento } from "@prisma/client";
import { DataTable, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { formatoFechaHora } from "@/shared/utils/formato";
import type { EventoBitacora } from "../../types/vistas";

const ETIQUETA_TIPO: Record<TipoEvento, string> = {
  OPERACION: "Operación",
  ASIGNACION: "Asignación",
  DOCUMENTO: "Documentos",
  ETAPA: "Etapas",
  COSTO: "Costos",
};

/** Historial de cambios, del más reciente al más antiguo. */
export function TabBitacora({ eventos }: { eventos: EventoBitacora[] }) {
  const columnas = useMemo<Columna<EventoBitacora>[]>(() => [
    { id: "fecha", encabezado: "Fecha y hora", celda: (e) => <span className="tabular-nums text-slate-500">{formatoFechaHora(e.fecha)}</span>, orden: (e) => e.fecha, csv: (e) => formatoFechaHora(e.fecha) },
    { id: "usuario", encabezado: "Usuario", celda: (e) => <span className="font-medium">{e.usuario}</span>, orden: (e) => e.usuario, csv: (e) => e.usuario },
    { id: "tipo", encabezado: "Tipo", celda: (e) => <span className="clp-chip">{ETIQUETA_TIPO[e.tipo]}</span>, orden: (e) => e.tipo, csv: (e) => ETIQUETA_TIPO[e.tipo] },
    { id: "cambio", encabezado: "Cambio", celda: (e) => e.descripcion, csv: (e) => e.descripcion },
    { id: "antes", encabezado: "Antes", celda: (e) => e.antes ?? "-", csv: (e) => e.antes },
    { id: "despues", encabezado: "Después", celda: (e) => e.despues ?? "-", csv: (e) => e.despues },
  ], []);

  const filtros = useMemo<FiltroRapido<EventoBitacora>[]>(
    () => (Object.keys(ETIQUETA_TIPO) as TipoEvento[]).map((t) => ({ id: t, etiqueta: ETIQUETA_TIPO[t], cumple: (e) => e.tipo === t })),
    [],
  );

  return (
    <DataTable
      titulo="Historial de cambios"
      filas={eventos}
      columnas={columnas}
      idFila={(e) => e.id}
      textoBusqueda={(e) => `${e.usuario} ${e.descripcion} ${e.antes ?? ""} ${e.despues ?? ""}`}
      placeholderBusqueda="Buscar en la bitácora"
      nombreRegistros="registros"
      filtros={filtros}
      ordenInicial={{ columna: "fecha", dir: "desc" }}
      exportarComo="bitacora"
      porPagina={50}
    />
  );
}
