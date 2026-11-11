"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, Download, List, Search } from "lucide-react";

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

/** Vista alterna a la tabla (por ejemplo, tarjetas), con su propia paginación. */
export interface VistaAlterna<T> {
  etiqueta: string;
  icono: ReactNode;
  porPagina: number;
  render: (filas: T[]) => ReactNode;
  /** false = muestra todas las filas sin paginar (p. ej. un tablero por columnas), aun sin resultados. */
  paginar?: boolean;
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
  /** Etiqueta del filtro que muestra todo. */
  etiquetaTodos?: string;
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
  /** Orden por omisión mientras no se ordena por una columna. */
  prioridad?: (a: T, b: T) => number;
  /** Vista de tarjetas (u otra) que se alterna con la tabla. Arranca en esta vista. */
  vistaAlterna?: VistaAlterna<T>;
  /** Detalle que se despliega debajo de la fila al picarla (uno a la vez). */
  expandir?: (fila: T) => ReactNode;
  /** En la vista alterna, la barra y las tarjetas flotan sobre el fondo, sin recuadro. */
  flotante?: boolean;
  className?: string;
}

const comparar = (a: string | number | null, b: string | number | null) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "es", { numeric: true });
};

export function descargarCsv<T>(nombre: string, columnas: Columna<T>[], filas: T[]) {
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

const ESPERA_CIERRE = 260;

/** Tabla con búsqueda, filtros con conteo, orden, selección, paginación, exportar a CSV, filas desplegables y vista de tarjetas. */
export function DataTable<T>({
  filas, columnas, idFila, textoBusqueda, placeholderBusqueda, nombreRegistros, filtros = [], etiquetaTodos = "Todos", ordenInicial,
  porPagina = 25, seleccionable, accionesLote, exportarComo, titulo, extraToolbar, vacio, alPicarFila, filtroExterno, prioridad,
  vistaAlterna, expandir, flotante, className,
}: DataTableProps<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [orden, setOrden] = useState(ordenInicial ?? null);
  const [pagina, setPagina] = useState(0);
  const [paginaAlt, setPaginaAlt] = useState(0);
  const [seleccion, setSeleccion] = useState<Set<string | number>>(new Set());
  const [modo, setModo] = useState<"alt" | "tabla">(vistaAlterna ? "alt" : "tabla");
  const [abierta, setAbierta] = useState<string | number | null>(null);
  const [detOn, setDetOn] = useState(false);
  const cuerpo = useRef<HTMLTableSectionElement>(null);
  /** Cambio de detalle pendiente: primero se cierra el abierto y luego se abre el nuevo. */
  const [cambio, setCambio] = useState<{ siguiente: string | number | null } | null>(null);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const f = filtros.find((x) => x.id === filtro);
    let res = filas.filter((fila) => (!q || textoBusqueda(fila).toLowerCase().includes(q)) && (!f || f.cumple(fila)) && (!filtroExterno || filtroExterno(fila)));
    const col = orden && columnas.find((c) => c.id === orden.columna);
    if (!col && prioridad) res = [...res].sort(prioridad);
    if (col?.orden) {
      const m = orden!.dir === "asc" ? 1 : -1;
      res = [...res].sort((a, b) => comparar(col.orden!(a), col.orden!(b)) * m);
    }
    return res;
  }, [filas, busqueda, filtro, filtros, orden, columnas, textoBusqueda, filtroExterno, prioridad]);

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const enPagina = visibles.slice(paginaActual * porPagina, (paginaActual + 1) * porPagina);
  const porPaginaAlt = vistaAlterna?.porPagina ?? porPagina;
  const totalAlt = Math.max(1, Math.ceil(visibles.length / porPaginaAlt));
  const paginaAltActual = Math.min(paginaAlt, totalAlt - 1);
  const enPaginaAlt = visibles.slice(paginaAltActual * porPaginaAlt, (paginaAltActual + 1) * porPaginaAlt);
  const seleccionadas = filas.filter((f) => seleccion.has(idFila(f)));
  const todasMarcadas = enPagina.length > 0 && enPagina.every((f) => seleccion.has(idFila(f)));
  const enAlt = vistaAlterna != null && modo === "alt";

  // El detalle se abre deslizando hacia abajo una vez montado.
  useEffect(() => {
    if (abierta == null) return;
    const raf = requestAnimationFrame(() => setDetOn(true));
    const t = setTimeout(() => cuerpo.current?.querySelector("tr.clp-dt-det")?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 320);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [abierta]);
  useEffect(() => {
    if (!cambio) return;
    const t = setTimeout(() => { setAbierta(cambio.siguiente); setCambio(null); }, ESPERA_CIERRE);
    return () => clearTimeout(t);
  }, [cambio]);

  const cerrarDetalle = () => { setCambio(null); setDetOn(false); setAbierta(null); };
  const alternarDetalle = (id: string | number) => {
    if (abierta == null) { setCambio(null); setAbierta(id); return; }
    // Primero se cierra el abierto y luego se abre el nuevo, uno a la vez.
    setDetOn(false);
    setCambio({ siguiente: abierta === id ? null : id });
  };

  // Esc cierra el detalle abierto.
  useEffect(() => {
    if (abierta == null) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { setDetOn(false); setCambio({ siguiente: null }); } };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierta]);

  const reiniciar = () => { setPagina(0); setPaginaAlt(0); cerrarDetalle(); };
  const alternarOrden = (id: string) => {
    cerrarDetalle();
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
  const nCols = columnas.length + (seleccionable ? 1 : 0) + (expandir ? 1 : 0);

  return (
    <div className={`clp-card clp-dt ${enAlt ? "clp-dt-alt" : ""} ${enAlt && flotante ? "clp-dt-flotante" : ""} ${className ?? ""}`}>
      <div className="clp-dt-toolbar">
        {titulo ? <div className="clp-dt-titulo">{titulo}</div> : null}
        <label className="clp-dt-buscar">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); reiniciar(); }}
            placeholder={placeholderBusqueda}
            aria-label="Buscar"
          />
        </label>
        {filtros.length > 0 ? (
          <div className="clp-dt-chips" role="group" aria-label="Filtros">
            <button type="button" className="clp-dt-chip" aria-pressed={filtro === null} onClick={() => { setFiltro(null); reiniciar(); }}>
              {etiquetaTodos} <span>{filas.length}</span>
            </button>
            {filtros.map((f) => (
              <button key={f.id} type="button" className="clp-dt-chip" aria-pressed={filtro === f.id} onClick={() => { setFiltro(filtro === f.id ? null : f.id); reiniciar(); }}>
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
        {vistaAlterna ? (
          <div className="clp-vista-sw" role="group" aria-label="Tipo de vista">
            <button type="button" title={vistaAlterna.etiqueta} aria-label={vistaAlterna.etiqueta} aria-pressed={modo === "alt"} onClick={() => { setModo("alt"); cerrarDetalle(); }}>{vistaAlterna.icono}</button>
            <button type="button" title="Tabla" aria-label="Tabla" aria-pressed={modo === "tabla"} onClick={() => { setModo("tabla"); cerrarDetalle(); }}><List aria-hidden /></button>
          </div>
        ) : null}
      </div>

      {seleccionable && !enAlt && seleccionadas.length > 0 ? (
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

      {enAlt ? (
        <div className="clp-dt-altcont">
          {vistaAlterna!.paginar === false ? vistaAlterna!.render(visibles) : visibles.length ? vistaAlterna!.render(enPaginaAlt) : <div className="clp-dt-alt-vacia">{vacio ?? "No hay resultados con esos filtros."}</div>}
          {vistaAlterna!.paginar !== false && visibles.length && (flotante || totalAlt > 1) ? (
            <nav className="clp-alt-pag" aria-label="Paginación">
              <button type="button" className="clp-ap-btn" disabled={paginaAltActual === 0} onClick={() => setPaginaAlt(paginaAltActual - 1)} aria-label="Página anterior"><ChevronLeft aria-hidden /></button>
              <span>Página <b>{paginaAltActual + 1}</b> de <b>{totalAlt}</b></span>
              <button type="button" className="clp-ap-btn" disabled={paginaAltActual >= totalAlt - 1} onClick={() => setPaginaAlt(paginaAltActual + 1)} aria-label="Página siguiente"><ChevronRight aria-hidden /></button>
            </nav>
          ) : null}
        </div>
      ) : (
        <div className="clp-dt-scroll">
          <table className="clp-dt-tabla">
            <thead>
              <tr>
                {expandir ? <th className="clp-dt-exp" aria-label="Desplegar" /> : null}
                {seleccionable ? (
                  <th className="clp-dt-cb"><input type="checkbox" checked={todasMarcadas} onChange={alternarPagina} aria-label="Seleccionar página" /></th>
                ) : null}
                {columnas.map((c) => (
                  <th key={c.id} className={c.alinear === "der" ? "text-right" : ""} aria-sort={orden?.columna === c.id ? (orden.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.orden ? (
                      <button type="button" className="clp-dt-orden" data-activo={orden?.columna === c.id} onClick={() => alternarOrden(c.id)}>
                        {c.encabezado}
                        <ChevronUp className={orden?.columna === c.id && orden.dir === "desc" ? "rotate-180" : ""} aria-hidden />
                      </button>
                    ) : (
                      c.encabezado
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={cuerpo}>
              {enPagina.length === 0 ? (
                <tr><td colSpan={nCols} className="clp-dt-vacia">{vacio ?? "No hay registros con esos filtros."}</td></tr>
              ) : (
                enPagina.map((fila) => {
                  const id = idFila(fila);
                  const esAbierta = expandir != null && abierta === id;
                  const picar = expandir ? () => alternarDetalle(id) : alPicarFila ? () => alPicarFila(fila) : null;
                  return (
                    <Fragment key={id}>
                      <tr
                        data-sel={seleccion.has(id) || undefined}
                        data-abierta={esAbierta || undefined}
                        data-cerrando={esAbierta && !detOn ? true : undefined}
                        className={picar ? "cursor-pointer" : ""}
                        tabIndex={expandir ? 0 : undefined}
                        aria-expanded={expandir ? esAbierta : undefined}
                        onClick={picar ? (e) => !(e.target as HTMLElement).closest("button, a, input, select, label") && picar() : undefined}
                        onKeyDown={expandir ? (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); alternarDetalle(id); } } : undefined}
                      >
                        {expandir ? <td className="clp-dt-exp"><span className="clp-exp-ico"><ChevronRight aria-hidden /></span></td> : null}
                        {seleccionable ? (
                          <td className="clp-dt-cb"><input type="checkbox" checked={seleccion.has(id)} onChange={() => alternarFila(id)} aria-label="Seleccionar fila" /></td>
                        ) : null}
                        {columnas.map((c) => (
                          <td key={c.id} className={`${c.alinear === "der" ? "text-right tabular-nums" : ""} ${c.className ?? ""}`}>{c.celda(fila)}</td>
                        ))}
                      </tr>
                      {esAbierta ? (
                        <tr className="clp-dt-det">
                          <td colSpan={nCols}>
                            <div className={`clp-det-env ${detOn ? "on" : ""}`}><div className="clp-det-in">{expandir!(fila)}</div></div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!enAlt ? (
        <div className="clp-dt-pie">
          <span>{visibles.length ? `Mostrando ${paginaActual * porPagina + 1}–${paginaActual * porPagina + enPagina.length} de ${visibles.length} ${nombreRegistros}` : `0 ${nombreRegistros}`}</span>
          {totalPaginas > 1 ? (
            <nav className="clp-dt-pag" aria-label="Paginación">
              <button type="button" className="clp-dt-pag-ib" disabled={paginaActual === 0} onClick={() => { setPagina(paginaActual - 1); cerrarDetalle(); }} aria-label="Página anterior"><ChevronLeft /></button>
              {Array.from({ length: totalPaginas }, (_, i) => (
                <button key={i} type="button" className="clp-dt-pag-n" aria-current={i === paginaActual ? "page" : undefined} onClick={() => { setPagina(i); cerrarDetalle(); }}>{i + 1}</button>
              ))}
              <button type="button" className="clp-dt-pag-ib" disabled={paginaActual >= totalPaginas - 1} onClick={() => { setPagina(paginaActual + 1); cerrarDetalle(); }} aria-label="Página siguiente"><ChevronRight /></button>
            </nav>
          ) : null}
        </div>
      ) : !flotante ? (
        <div className="clp-dt-pie"><span>{visibles.length} {nombreRegistros}</span></div>
      ) : null}
    </div>
  );
}
