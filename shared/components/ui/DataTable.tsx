"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownUp, ArrowUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

export interface Columna<T> {
  id: string;
  encabezado: string;
  celda: (fila: T) => ReactNode;
  /** Valor para ordenar. Si no se da, la columna no se puede ordenar. */
  orden?: (fila: T) => string | number | null;
  /** Valor para exportar a CSV. Si no se da, la columna no se exporta. */
  csv?: (fila: T) => string | number | null;
  alinear?: "izq" | "der";
  className?: string;
}

export interface FiltroRapido<T> {
  id: string;
  etiqueta: string;
  cumple: (fila: T) => boolean;
}

interface DataTableProps<T> {
  filas: T[];
  columnas: Columna<T>[];
  idFila: (fila: T) => string | number;
  /** Texto en el que busca el buscador. */
  textoBusqueda: (fila: T) => string;
  placeholderBusqueda: string;
  nombreRegistros: string;
  filtros?: FiltroRapido<T>[];
  ordenInicial?: { columna: string; dir: "asc" | "desc" };
  porPagina?: number;
  seleccionable?: boolean;
  accionesLote?: (seleccion: T[], limpiar: () => void) => ReactNode;
  exportarComo?: string;
  titulo?: ReactNode;
  extraToolbar?: ReactNode;
  vacio?: ReactNode;
  alPicarFila?: (fila: T) => void;
  /** Filtro aplicado desde fuera (por ejemplo, un widget del Home). */
  filtroExterno?: ((fila: T) => boolean) | null;
}

const comparar = (a: string | number | null, b: string | number | null) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "es", { numeric: true });
};

function descargarCsv<T>(nombre: string, columnas: Columna<T>[], filas: T[]) {
  const exportables = columnas.filter((c) => c.csv);
  const escapar = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lineas = [exportables.map((c) => escapar(c.encabezado)).join(","), ...filas.map((f) => exportables.map((c) => escapar(c.csv!(f))).join(","))];
  // BOM para que Excel respete acentos.
  const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `${nombre}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

/** Tabla con búsqueda, filtros con conteo, orden, selección, paginación y exportar a CSV. */
export function DataTable<T>({
  filas, columnas, idFila, textoBusqueda, placeholderBusqueda, nombreRegistros, filtros = [], ordenInicial,
  porPagina = 25, seleccionable, accionesLote, exportarComo, titulo, extraToolbar, vacio, alPicarFila, filtroExterno,
}: DataTableProps<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [orden, setOrden] = useState(ordenInicial ?? null);
  const [pagina, setPagina] = useState(0);
  const [seleccion, setSeleccion] = useState<Set<string | number>>(new Set());

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const f = filtros.find((x) => x.id === filtro);
    let res = filas.filter((fila) => (!q || textoBusqueda(fila).toLowerCase().includes(q)) && (!f || f.cumple(fila)) && (!filtroExterno || filtroExterno(fila)));
    const col = orden && columnas.find((c) => c.id === orden.columna);
    if (col?.orden) {
      const m = orden!.dir === "asc" ? 1 : -1;
      res = [...res].sort((a, b) => comparar(col.orden!(a), col.orden!(b)) * m);
    }
    return res;
  }, [filas, busqueda, filtro, filtros, orden, columnas, textoBusqueda, filtroExterno]);

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const enPagina = visibles.slice(paginaActual * porPagina, (paginaActual + 1) * porPagina);
  const seleccionadas = filas.filter((f) => seleccion.has(idFila(f)));
  const todasMarcadas = enPagina.length > 0 && enPagina.every((f) => seleccion.has(idFila(f)));

  const alternarOrden = (id: string) => {
    setOrden((o) => (o?.columna === id ? { columna: id, dir: o.dir === "asc" ? "desc" : "asc" } : { columna: id, dir: "asc" }));
  };
  const alternarFila = (id: string | number) =>
    setSeleccion((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const alternarPagina = () =>
    setSeleccion((s) => {
      const n = new Set(s);
      enPagina.forEach((f) => (todasMarcadas ? n.delete(idFila(f)) : n.add(idFila(f))));
      return n;
    });
  const nCols = columnas.length + (seleccionable ? 1 : 0);

  return (
    <div className="clp-card clp-dt">
      <div className="clp-dt-toolbar">
        {titulo ? <div className="clp-dt-titulo">{titulo}</div> : null}
        <label className="clp-dt-buscar">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }}
            placeholder={placeholderBusqueda}
            aria-label="Buscar"
          />
        </label>
        {filtros.length > 0 ? (
          <div className="clp-dt-chips" role="group" aria-label="Filtros">
            <button type="button" className="clp-dt-chip" aria-pressed={filtro === null} onClick={() => { setFiltro(null); setPagina(0); }}>
              Todos <span>{filas.length}</span>
            </button>
            {filtros.map((f) => (
              <button key={f.id} type="button" className="clp-dt-chip" aria-pressed={filtro === f.id} onClick={() => { setFiltro(filtro === f.id ? null : f.id); setPagina(0); }}>
                {f.etiqueta} <span>{filas.filter(f.cumple).length}</span>
              </button>
            ))}
          </div>
        ) : null}
        <span className="flex-1" />
        {extraToolbar}
        {exportarComo ? (
          <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => descargarCsv(exportarComo, columnas, visibles)}>
            <Download className="h-4 w-4" /> Exportar
          </button>
        ) : null}
      </div>

      {seleccionable && seleccionadas.length > 0 ? (
        <div className="clp-dt-lote">
          <span>{seleccionadas.length} seleccionado{seleccionadas.length === 1 ? "" : "s"}</span>
          <span className="flex-1" />
          {exportarComo ? (
            <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => descargarCsv(`${exportarComo}-seleccion`, columnas, seleccionadas)}>
              <Download className="h-4 w-4" /> Exportar selección
            </button>
          ) : null}
          {accionesLote?.(seleccionadas, () => setSeleccion(new Set()))}
        </div>
      ) : null}

      <div className="clp-dt-scroll">
        <table className="clp-dt-tabla">
          <thead>
            <tr>
              {seleccionable ? (
                <th className="clp-dt-cb"><input type="checkbox" checked={todasMarcadas} onChange={alternarPagina} aria-label="Seleccionar página" /></th>
              ) : null}
              {columnas.map((c) => (
                <th key={c.id} className={c.alinear === "der" ? "text-right" : ""} aria-sort={orden?.columna === c.id ? (orden.dir === "asc" ? "ascending" : "descending") : undefined}>
                  {c.orden ? (
                    <button type="button" className="clp-dt-orden" data-activo={orden?.columna === c.id} onClick={() => alternarOrden(c.id)}>
                      {c.encabezado}
                      {orden?.columna === c.id ? (
                        <ArrowUp className={`h-3 w-3 ${orden.dir === "desc" ? "rotate-180" : ""}`} aria-hidden />
                      ) : (
                        <ArrowDownUp className="h-3 w-3 opacity-40" aria-hidden />
                      )}
                    </button>
                  ) : (
                    c.encabezado
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enPagina.length === 0 ? (
              <tr><td colSpan={nCols} className="clp-dt-vacia">{vacio ?? "No hay registros con esos filtros."}</td></tr>
            ) : (
              enPagina.map((fila) => {
                const id = idFila(fila);
                return (
                  <tr
                    key={id}
                    data-sel={seleccion.has(id) || undefined}
                    className={alPicarFila ? "cursor-pointer" : ""}
                    onClick={alPicarFila ? (e) => !(e.target as HTMLElement).closest("button, a, input, select, label") && alPicarFila(fila) : undefined}
                  >
                    {seleccionable ? (
                      <td className="clp-dt-cb"><input type="checkbox" checked={seleccion.has(id)} onChange={() => alternarFila(id)} aria-label="Seleccionar fila" /></td>
                    ) : null}
                    {columnas.map((c) => (
                      <td key={c.id} className={`${c.alinear === "der" ? "text-right tabular-nums" : ""} ${c.className ?? ""}`}>{c.celda(fila)}</td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="clp-dt-pie">
        <span>Mostrando {visibles.length === 0 ? 0 : paginaActual * porPagina + 1}–{paginaActual * porPagina + enPagina.length} de {visibles.length} {nombreRegistros}</span>
        {totalPaginas > 1 ? (
          <span className="flex items-center gap-1">
            <button type="button" className="clp-icon-btn" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-2 tabular-nums">{paginaActual + 1} / {totalPaginas}</span>
            <button type="button" className="clp-icon-btn" disabled={paginaActual >= totalPaginas - 1} onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
