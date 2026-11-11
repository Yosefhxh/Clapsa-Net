"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Clock, FileText, GripVertical, Plus, Ship, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import { useSession } from "@/features/session";
import { DataTable, type Columna } from "@/shared/components/ui/DataTable";
import { useAhora } from "@/shared/hooks/useAhora";
import { formatoFecha } from "@/shared/utils/formato";
import type { OperacionResumen } from "@/features/operaciones/types/vistas";
import { PillSituacion, Semaforo } from "@/features/operaciones/components/etiquetas";
import { KpiWidget } from "./KpiWidget";
import { notaWidget, WIDGET, WIDGETS } from "../widgets";
import { useOrdenHome } from "../hooks/useOrdenHome";
import type { GrupoOrden, OrdenHome } from "../orden";

const ZONA = "America/Mexico_City";
const H72 = 72 * 3_600_000;

interface Pendiente {
  clave: string;
  tono: "riesgo" | "alerta" | "info";
  icono: LucideIcon;
  texto: string;
  detalle: string;
  href: string;
}

interface Props {
  operaciones: OperacionResumen[];
  ordenGuardado: OrdenHome;
  alertasActivas: string[];
  encargosPorVencer: { folio: string; razonSocial: string; vence: string }[];
  /** Hora de la petición (ms): el servidor y la hidratación calculan con ella. */
  ahoraServidor: number;
}

const COLOR: Record<Pendiente["tono"], string> = { riesgo: "#E0614F", alerta: "#E3A23B", info: "#3157C2" };
const RANGO: Record<Pendiente["tono"], number> = { riesgo: 0, alerta: 1, info: 2 };
/** Primero lo urgente: reconocimiento, luego pago y luego lo que espera cliente. */
const PRIORIDAD: Record<string, number> = { "En reconocimiento": 0, "Por pagar pedimento": 1, "En espera de cliente": 2 };
const LIBERADA = ["Desaduanada", "Despachada", "Cerrada"];
const SECCION: Record<string, string> = { tabla: "Requieren atención", avisos: "Columna de avisos", arribos: "Próximos arribos", pendientes: "Pendientes de hoy" };

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const diaMx = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: ZONA });
const horaMx = (t: number) => new Date(t).toLocaleTimeString("es-MX", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const tiempoEta = (o: OperacionResumen) => (o.eta ? new Date(o.eta).getTime() : Number.POSITIVE_INFINITY);
const folios = (ops: OperacionResumen[]) => ops.slice(0, 2).map((o) => o.folio).join(", ") + (ops.length > 2 ? "…" : "");

const nombreOrden = (grupo: GrupoOrden, id: string) => (grupo === "kpis" ? WIDGET(id)?.titulo ?? id : SECCION[id] ?? id);

export function HomeVista({ operaciones, ordenGuardado, alertasActivas, encargosPorVencer, ahoraServidor }: Props) {
  const router = useRouter();
  const ahora = useAhora(ahoraServidor);
  const { puede } = useSession();
  const [filtro, setFiltro] = useState<string | null>(null);
  const { orden, ordenando, estado, raiz, entrar, salir, restablecer, alPresionar, alTecla, item } = useOrdenHome(ordenGuardado, nombreOrden);

  const conteos = useMemo(() => Object.fromEntries(WIDGETS.map((w) => [w.id, operaciones.filter((o) => w.cumple(o, ahora)).length])), [operaciones, ahora]);
  const definicionFiltro = filtro ? WIDGET(filtro) : null;

  const pendientes = useMemo<Pendiente[]>(() => {
    const de = (id: string) => operaciones.filter((o) => WIDGET(id)!.cumple(o, ahora));
    const rojo = de("reconocimiento"), pagar = de("por_pagar"), sinCliente = de("en_espera_cliente"), rechazados = de("docs_rechazados"), arribo = de("proximo_llegar");
    const lista: (Pendiente | null)[] = [
      rojo.length ? { clave: "semaforo_rojo", tono: "riesgo", icono: TriangleAlert, texto: `${plural(rojo.length, "operación", "operaciones")} con semáforo rojo`, detalle: `Reconocimiento aduanero · ${folios(rojo)}`, href: "/operaciones" } : null,
      rechazados.length ? { clave: "documento_rechazado", tono: "riesgo", icono: FileText, texto: `${plural(rechazados.length, "operación", "operaciones")} con documentos rechazados`, detalle: `Esperan una nueva versión · ${folios(rechazados)}`, href: "/operaciones" } : null,
      pagar.length ? { clave: "pedimento_por_pagar", tono: "alerta", icono: Clock, texto: `${plural(pagar.length, "pedimento", "pedimentos")} por pagar`, detalle: `Validados y sin pago · ${folios(pagar)}`, href: "/operaciones" } : null,
      encargosPorVencer.length ? { clave: "encargo_por_vencer", tono: "alerta", icono: CalendarClock, texto: `${plural(encargosPorVencer.length, "encargo conferido", "encargos conferidos")} por vencer`, detalle: encargosPorVencer.slice(0, 2).map((e) => `${e.folio} · ${formatoFecha(e.vence)}`).join(", "), href: "/clientes/directo" } : null,
      sinCliente.length ? { clave: "sin_cliente", tono: "info", icono: UserRound, texto: `${plural(sinCliente.length, "operación", "operaciones")} sin cliente asignado`, detalle: `${folios(sinCliente)} · bloquea el pedimento`, href: "/operaciones" } : null,
      arribo.length ? { clave: "proximo_arribo", tono: "info", icono: Ship, texto: `${plural(arribo.length, "arribo", "arribos")} en 48 h`, detalle: "Ten listos documentos y revalidación", href: "/operaciones" } : null,
    ];
    return lista.filter((p): p is Pendiente => p != null && alertasActivas.includes(p.clave)).sort((a, b) => RANGO[a.tono] - RANGO[b.tono]);
  }, [operaciones, ahora, encargosPorVencer, alertasActivas]);

  const arribos = useMemo(() => {
    const hoy = diaMx(ahora);
    return operaciones
      .filter((o) => o.estado !== "CERRADA" && !LIBERADA.includes(o.situacion) && o.eta && diaMx(tiempoEta(o)) >= hoy && tiempoEta(o) - ahora <= H72)
      .sort((a, b) => tiempoEta(a) - tiempoEta(b))
      .slice(0, 3);
  }, [operaciones, ahora]);

  const columnas = useMemo<Columna<OperacionResumen>[]>(() => [
    { id: "folio", encabezado: "Folio", celda: (o) => <Link href={`/operaciones/${o.id}`} className="clp-mono font-semibold text-titulo">{o.folio}</Link>, orden: (o) => o.folio },
    { id: "cliente", encabezado: "Cliente", celda: (o) => <span className="inline-block max-w-[240px] truncate align-middle">{o.clienteNombre ?? "Sin cliente asignado"}</span>, orden: (o) => o.clienteNombre },
    { id: "situacion", encabezado: "Estatus", celda: (o) => <PillSituacion situacion={o.situacion} />, orden: (o) => o.situacion },
    { id: "semaforo", encabezado: "Semáforo", celda: (o) => <Semaforo valor={o.semaforo} />, orden: (o) => o.semaforo },
    { id: "eta", encabezado: "ETA", celda: (o) => formatoFecha(o.eta), orden: (o) => o.eta, alinear: "der" },
  ], []);

  const prioridad = (a: OperacionResumen, b: OperacionResumen) =>
    (PRIORIDAD[a.situacion] ?? 3) - (PRIORIDAD[b.situacion] ?? 3) || tiempoEta(a) - tiempoEta(b);

  const tabla = (
    <div key="tabla" className="clp-home-tabla" {...item("grid", "tabla")}>
      <DataTable
        className="h-full"
        titulo="Requieren atención"
        filas={operaciones}
        filtroExterno={definicionFiltro ? (o) => definicionFiltro.cumple(o, ahora) : (o) => o.estado !== "CERRADA" && !LIBERADA.includes(o.situacion)}
        prioridad={prioridad}
        columnas={columnas}
        idFila={(o) => o.id}
        textoBusqueda={(o) => [o.folio, o.clienteNombre, o.numeroPedimento, ...o.contenedores].filter(Boolean).join(" ")}
        placeholderBusqueda="Folio, cliente o pedimento"
        nombreRegistros="operaciones"
        porPagina={8}
        alPicarFila={(o) => router.push(`/operaciones/${o.id}`)}
        vacio={operaciones.length === 0 ? "Aún no hay operaciones." : "No hay operaciones que requieran atención."}
      />
    </div>
  );

  const tarjetaArribos = (
    <section key="arribos" className="clp-card clp-lado" {...item("avisos", "arribos")}>
      <div className="clp-card-h">
        <h3>Próximos arribos</h3>
        <span className="clp-card-h-tenue">72 h</span>
        <span className="flex-1" />
        <Link href="/operaciones" className="clp-lnk-ver">Ver todas</Link>
      </div>
      {arribos.length ? (
        <ol className="clp-feed">
          {arribos.map((o) => {
            const t = tiempoEta(o), dia = diaMx(t), hoy = diaMx(ahora), hora = horaMx(t);
            const cuando = dia === hoy ? "Hoy" : dia === diaMx(ahora + 86_400_000) ? "Mañana" : formatoFecha(o.eta).slice(0, 5);
            return (
              <li key={o.id}>
                <Link href={`/operaciones/${o.id}`} className="clp-feed-i">
                  <span className="clp-feed-ico" style={{ "--c": "#2A48A6" } as React.CSSProperties}><Ship aria-hidden /></span>
                  <span className="clp-feed-tx">
                    <b><span className="clp-mono">{o.folio}</span>{hora !== "00:00" ? ` · ETA ${hora}` : ""}</b>
                    <span>{o.clienteNombre ?? "Sin cliente asignado"}</span>
                    <small>{[o.aduana, o.contenedores[0]].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className={`clp-feed-cuando ${cuando === "Hoy" ? "clp-feed-hoy" : ""}`}>{cuando}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : <p className="clp-feed-vacio">Sin arribos en las próximas 72 h.</p>}
    </section>
  );

  const tarjetaPendientes = (
    <section key="pendientes" className="clp-card clp-lado" {...item("avisos", "pendientes")}>
      <div className="clp-card-h">
        <h3>Pendientes de hoy</h3>
        {pendientes.length ? <span className="clp-cnt-pend">{pendientes.length}</span> : null}
      </div>
      {pendientes.length ? (
        <ol className="clp-feed">
          {pendientes.map((p) => (
            <li key={p.clave}>
              <Link href={p.href} className="clp-feed-i">
                <span className="clp-feed-ico" style={{ "--c": COLOR[p.tono] } as React.CSSProperties}><p.icono aria-hidden /></span>
                <span className="clp-feed-tx"><b>{p.texto}</b><small>{p.detalle}</small></span>
                <span className={`clp-feed-cuando ${p.tono === "riesgo" ? "clp-feed-urg" : ""}`}>{p.tono === "riesgo" ? "Urgente" : "Hoy"}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : <p className="clp-feed-vacio">Sin pendientes urgentes.</p>}
    </section>
  );

  const avisos = (
    <div key="avisos" className="clp-home-avisos" {...item("grid", "avisos")}>
      {orden.avisos.map((id) => (id === "arribos" ? tarjetaArribos : tarjetaPendientes))}
    </div>
  );

  return (
    <div ref={raiz} className={`clp-home ${ordenando ? "clp-ordenando" : ""}`} onPointerDown={alPresionar} onKeyDown={alTecla}>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">Control de Tráficos</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="clp-ord-estado" aria-live="polite">{estado}</span>
          {ordenando ? (
            <>
              <button type="button" className="clp-ord-btn" onClick={restablecer}>Restablecer orden</button>
              <button type="button" className="clp-btn clp-btn-primary" onClick={salir}><GripVertical className="h-4 w-4" /> Listo</button>
            </>
          ) : (
            <>
              <button type="button" className="clp-ord-btn" onClick={() => { setFiltro(null); entrar(); }}><GripVertical aria-hidden /> Personalizar orden</button>
              {puede("operaciones.operar") ? <Link href="/operaciones" className="clp-btn clp-btn-primary"><Plus className="h-4 w-4" /> Nueva operación</Link> : null}
            </>
          )}
        </div>
      </div>

      <div className="clp-kpis">
        {orden.kpis.map((id) => (
          <KpiWidget
            key={id}
            definicion={WIDGET(id)!}
            valor={conteos[id] ?? 0}
            nota={notaWidget(id, operaciones, ahora)}
            activo={filtro === id}
            onClick={() => { if (!ordenando) setFiltro(filtro === id ? null : id); }}
            {...item("kpis", id)}
          />
        ))}
      </div>

      <div className={`clp-home-grid ${orden.grid[0] === "avisos" ? "clp-home-grid-inv" : ""}`}>
        {orden.grid.map((id) => (id === "tabla" ? tabla : avisos))}
      </div>
    </div>
  );
}
