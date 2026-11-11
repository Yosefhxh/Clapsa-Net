"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock, Columns3, Download, Plus, TriangleAlert } from "lucide-react";
import type { ClavePedimento } from "@prisma/client";
import { useSession } from "@/features/session";
import { DataTable, descargarCsv, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { formatoFecha } from "@/shared/utils/formato";
import { COLUMNAS_TABLERO, columnaTablero } from "../domain/proceso";
import { ETIQUETA_MEDIO, type OpcionCliente, type OperacionResumen } from "../types/vistas";
import { PillSituacion, Semaforo, TipoOperacionTag } from "./etiquetas";
import { RegistroOperacion, type DocumentoCatalogo } from "./RegistroOperacion";

interface Props {
  operaciones: OperacionResumen[];
  opciones: OpcionCliente[];
  aduanas: { clave: string; nombre: string }[];
  claves: ClavePedimento[];
  documentos: DocumentoCatalogo[];
  patente: string | null;
  siguienteFolio: string;
  /** Desde Clientes se llega con ?nueva=1&cliente=ID para abrir el registro con el cliente elegido. */
  nueva: { cliente: number | null } | null;
}

const etaCorta = (iso: string | null) => (iso ? formatoFecha(iso).slice(0, 5) : "—");

/** Alerta principal de la operación (si hay). */
function alertaDe(o: OperacionResumen): string | null {
  if (o.situacion === "En reconocimiento") return "Reconocimiento aduanero en curso";
  if (o.situacion === "Por pagar pedimento") return "Pedimento validado sin pago";
  if (o.estado === "EN_ESPERA_CLIENTE") return "El pedimento se bloquea hasta asignar cliente";
  if (o.documentosRechazados) return `${o.documentosRechazados} documento${o.documentosRechazados === 1 ? "" : "s"} rechazado${o.documentosRechazados === 1 ? "" : "s"}`;
  return null;
}

function MiniFases({ o }: { o: OperacionResumen }) {
  const cerrada = o.estado === "CERRADA";
  return (
    <div className="clp-mini-fases" aria-label={`Fase ${o.fase} de 8`}>
      {Array.from({ length: 8 }, (_, i) => <i key={i} className={cerrada || i < o.fase - 1 ? "ok" : i === o.fase - 1 ? "act" : ""} />)}
    </div>
  );
}

const Dato = ({ etiqueta, children, mono }: { etiqueta: string; children: ReactNode; mono?: boolean }) => (
  <div className="clp-dt-d"><small>{etiqueta}</small><span className={mono ? "clp-mono" : ""}>{children}</span></div>
);
const Bloque = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div className="clp-dt-b"><div className="clp-dt-t">{titulo}</div>{children}</div>
);

type Modo = { tipo: "lista" } | { tipo: "saliendo"; cliente: number | null } | { tipo: "registro"; cliente: number | null };

export function OperacionesVista({ operaciones, opciones, aduanas, claves, documentos, patente, siguienteFolio, nueva }: Props) {
  const router = useRouter();
  const { puede } = useSession();
  const puedeOperar = puede("operaciones.operar");
  const [modo, setModo] = useState<Modo>(() => (nueva && puedeOperar ? { tipo: "registro", cliente: nueva.cliente } : { tipo: "lista" }));
  const [volviendo, setVolviendo] = useState(false);
  const [resaltar, setResaltar] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const cambio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!resaltar) return;
    const t = setTimeout(() => setResaltar(null), 2200);
    return () => clearTimeout(t);
  }, [resaltar]);
  useEffect(() => () => { if (cambio.current) clearTimeout(cambio.current); }, []);

  // Una tarjeta abierta a la vez: la anterior se cierra antes de abrir la nueva.
  const alternar = (id: string | null) => {
    if (cerrando) return;
    if (!abierta) { setAbierta(id); return; }
    setCerrando(true);
    cambio.current = setTimeout(() => { setAbierta(id === abierta ? null : id); setCerrando(false); }, 260);
  };
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector(".clp-rc")) alternar(null); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  });

  const abrirRegistro = (cliente: number | null = null) => {
    setAbierta(null);
    setModo({ tipo: "saliendo", cliente });
    setTimeout(() => setModo({ tipo: "registro", cliente }), 300);
  };
  const volver = (guardado?: { id: string; verResumen: boolean }) => {
    if (guardado?.verResumen) { router.push(`/operaciones/${guardado.id}`); return; }
    if (nueva) router.replace("/operaciones", { scroll: false });
    setModo({ tipo: "lista" });
    setVolviendo(true);
    setTimeout(() => setVolviendo(false), 700);
    if (guardado) setResaltar(guardado.id);
  };

  const tablero = (filas: OperacionResumen[]) => {
    let i = 0;
    return (
      <div className="clp-kb">
        {COLUMNAS_TABLERO.map((col) => {
          const ops = filas.filter((o) => columnaTablero(o) === col.id);
          const cuello = col.id === "reconocimiento" && ops.length >= 2;
          return (
            <section key={col.id} className={`clp-kb-col ${cuello ? "cuello" : ""}`} style={{ "--c": col.color } as React.CSSProperties} aria-label={`${col.nombre}: ${ops.length}`}>
              <header><i /><b>{col.nombre}</b><span className="clp-kb-n">{ops.length}</span></header>
              {cuello ? <div className="clp-kb-alerta"><TriangleAlert aria-hidden />Cuello de botella</div> : null}
              <div className="clp-kb-lista">
                {ops.length ? ops.map((o) => {
                  const abiertaEsta = abierta === o.id;
                  const alerta = alertaDe(o);
                  return (
                    <article
                      key={o.id}
                      className={`clp-kb-card ${abiertaEsta ? "abierta" : ""} ${abiertaEsta && cerrando ? "cerrando" : ""} ${resaltar === o.id ? "nueva" : ""}`}
                      style={{ "--i": i++ } as React.CSSProperties}
                    >
                      <div
                        className="clp-kb-sum"
                        role="button"
                        tabIndex={0}
                        aria-expanded={abiertaEsta}
                        aria-label={`${o.folio}, ${o.clienteNombre ?? "sin cliente"}, ${o.situacion}`}
                        onClick={() => alternar(o.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alternar(o.id); } }}
                      >
                        <div className="clp-kb-1"><span className="clp-mono">{o.folio}</span><span className="clp-kb-1d"><TipoOperacionTag tipo={o.tipo} /><span className="clp-kb-exp"><ChevronDown aria-hidden /></span></span></div>
                        <div className="clp-kb-cli">{o.clienteNombre ?? "Sin cliente asignado"}</div>
                        <div className="clp-kb-meta">{o.aduana}{o.contenedores[0] ? <> · <span className="clp-mono">{o.contenedores[0]}</span></> : ` · ${ETIQUETA_MEDIO[o.medio]}`}</div>
                        <div className="clp-kb-bar"><i style={{ width: `${o.avance.porcentaje}%` }} /></div>
                        <div className="clp-kb-pie"><Semaforo valor={o.semaforo} /><span className="flex-1" /><span className="clp-kb-eta" title="ETA"><Clock aria-hidden />{etaCorta(o.eta)}</span></div>
                      </div>
                      {abiertaEsta ? (
                        <div className="clp-kb-env">
                          <div className="clp-kb-det">
                            <div className="clp-kd-l">Pedimento</div><div className={`clp-kd-v ${o.numeroPedimento ? "clp-mono" : ""}`}>{o.numeroPedimento ?? "Se captura al validar"}</div>
                            <div className="clp-kd-l">Fase {o.fase} de 8 · {o.faseNombre}</div><MiniFases o={o} />
                            <div className="clp-kd-l">Próximo paso</div><div className="clp-kd-v">{o.proximoPaso}</div>
                            {alerta ? <div className="clp-dt-alerta"><TriangleAlert aria-hidden />{alerta}</div> : null}
                            <Link href={`/operaciones/${o.id}`} className="clp-btn clp-btn-primary clp-btn-sm clp-kd-btn">Abrir operación completa</Link>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                }) : <div className="clp-kb-vacia">Sin operaciones</div>}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const columnas = useMemo<Columna<OperacionResumen>[]>(() => [
    { id: "folio", encabezado: "Folio", celda: (o) => <span className="clp-mono font-semibold">{o.folio}</span>, orden: (o) => o.folio, csv: (o) => o.folio },
    { id: "cliente", encabezado: "Cliente", celda: (o) => <span className={`inline-block max-w-[260px] truncate align-middle ${o.clienteNombre ? "" : "text-slate-500"}`}>{o.clienteNombre ?? "Sin cliente asignado"}</span>, orden: (o) => o.clienteNombre, csv: (o) => o.clienteNombre },
    { id: "situacion", encabezado: "Estatus", celda: (o) => <PillSituacion situacion={o.situacion} />, orden: (o) => o.situacion, csv: (o) => o.situacion },
    { id: "semaforo", encabezado: "Semáforo", celda: (o) => <Semaforo valor={o.semaforo} />, orden: (o) => o.semaforo, csv: (o) => o.semaforo ?? "" },
    { id: "eta", encabezado: "ETA", celda: (o) => <span className="tabular-nums">{formatoFecha(o.eta)}</span>, orden: (o) => o.eta, csv: (o) => formatoFecha(o.eta), alinear: "der" },
    {
      id: "avance", encabezado: "Avance",
      celda: (o) => <span className="clp-etapa"><span className="clp-etapa-bar"><i style={{ width: `${o.avance.porcentaje}%` }} /></span><span className="clp-etapa-pct">{o.avance.porcentaje}%</span></span>,
      orden: (o) => o.avance.porcentaje, csv: (o) => `${o.avance.porcentaje}%`,
    },
  ], []);

  const columnasCsv: Columna<OperacionResumen>[] = [
    ...columnas,
    { id: "tipo", encabezado: "Tipo", celda: () => null, csv: (o) => o.tipo },
    { id: "medio", encabezado: "Medio", celda: () => null, csv: (o) => ETIQUETA_MEDIO[o.medio] },
    { id: "aduana", encabezado: "Aduana", celda: () => null, csv: (o) => o.aduana },
    { id: "pedimento", encabezado: "Pedimento", celda: () => null, csv: (o) => o.numeroPedimento },
    { id: "importador", encabezado: "Importador", celda: () => null, csv: (o) => o.importadorNombre },
    { id: "referencia", encabezado: "Referencia del cliente", celda: () => null, csv: (o) => o.folioManual },
    { id: "contenedores", encabezado: "Contenedores", celda: () => null, csv: (o) => o.contenedores.join(" · ") },
    { id: "fase", encabezado: "Fase", celda: () => null, csv: (o) => `${o.fase} · ${o.faseNombre}` },
    { id: "proximo", encabezado: "Próximo paso", celda: () => null, csv: (o) => o.proximoPaso },
    { id: "creada", encabezado: "Creada", celda: () => null, csv: (o) => formatoFecha(o.creadaEn) },
    { id: "cerrada", encabezado: "Cerrada", celda: () => null, csv: (o) => formatoFecha(o.cerradaEn) },
  ];

  const filtros = useMemo<FiltroRapido<OperacionResumen>[]>(() => [
    { id: "impo", etiqueta: "Importación", cumple: (o) => o.tipo === "IMPO" },
    { id: "expo", etiqueta: "Exportación", cumple: (o) => o.tipo === "EXPO" },
    { id: "rojo", etiqueta: "Semáforo rojo", cumple: (o) => o.semaforo === "ROJO" && o.estado !== "CERRADA" },
    { id: "cerradas", etiqueta: "Cerradas", cumple: (o) => o.estado === "CERRADA" },
  ], []);

  const expandir = (o: OperacionResumen) => {
    const alerta = alertaDe(o);
    return (
      <>
        <Bloque titulo="Embarque">
          <Dato etiqueta="Pedimento" mono={o.numeroPedimento != null}>{o.numeroPedimento ?? "Se captura al validar"}</Dato>
          <Dato etiqueta="Contenedor" mono>{o.contenedores.length ? o.contenedores.join(", ") : "—"}</Dato>
          <Dato etiqueta="Aduana · tipo">{o.aduana} · {o.tipo} · {ETIQUETA_MEDIO[o.medio]}</Dato>
          <Dato etiqueta="ETA">{formatoFecha(o.eta)}</Dato>
        </Bloque>
        <Bloque titulo="Avance">
          <div className="clp-dt-fase"><span>Fase <b>{o.fase} de 8 · {o.faseNombre}</b></span><Semaforo valor={o.semaforo} /></div>
          <MiniFases o={o} />
          {alerta ? <div className="clp-dt-alerta"><TriangleAlert aria-hidden />{alerta}</div> : null}
        </Bloque>
        <Bloque titulo="Próximo paso">
          <div className="clp-dt-sig">{o.proximoPaso}</div>
          {o.clienteNombre && o.importadorNombre && o.clienteTipo === "FORWARDER" ? <Dato etiqueta="Importador">{o.importadorNombre}</Dato> : null}
          <div className="clp-dt-acc"><Link href={`/operaciones/${o.id}`} className="clp-btn clp-btn-primary clp-btn-sm">Abrir operación completa</Link></div>
        </Bloque>
      </>
    );
  };

  if (modo.tipo === "registro") {
    return (
      <RegistroOperacion
        opciones={opciones}
        aduanas={aduanas}
        claves={claves}
        documentos={documentos}
        patente={patente}
        siguienteFolio={siguienteFolio}
        clienteInicial={modo.cliente}
        onVolver={volver}
      />
    );
  }

  return (
    <div className={`clp-cli clp-ops ${modo.tipo === "saliendo" ? "clp-rc-saliendo" : ""} ${volviendo ? "clp-rc-volviendo" : ""}`}>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">Operaciones</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => descargarCsv("operaciones", columnasCsv, operaciones)}>
            <Download className="h-4 w-4" /> Exportar
          </button>
          {puedeOperar ? (
            <button type="button" className="clp-btn clp-btn-primary" onClick={() => abrirRegistro()}>
              <Plus className="h-4 w-4" /> Nueva operación
            </button>
          ) : null}
        </div>
      </div>

      <DataTable
        className="clp-cli-tabla"
        filas={operaciones}
        columnas={columnas}
        idFila={(o) => o.id}
        textoBusqueda={(o) => [o.folio, o.folioManual, o.clienteNombre, o.importadorNombre, o.numeroPedimento, o.aduana, ...o.contenedores].filter(Boolean).join(" ")}
        placeholderBusqueda="Folio, cliente, pedimento o contenedor"
        nombreRegistros="operaciones"
        filtros={filtros}
        etiquetaTodos="Todas"
        ordenInicial={{ columna: "folio", dir: "desc" }}
        vistaAlterna={{ etiqueta: "Tablero", icono: <Columns3 aria-hidden />, porPagina: 1000, paginar: false, render: tablero }}
        flotante
        expandir={expandir}
        vacio={operaciones.length === 0 ? "Aún no hay operaciones. Crea la primera con “Nueva operación”." : undefined}
      />
    </div>
  );
}
