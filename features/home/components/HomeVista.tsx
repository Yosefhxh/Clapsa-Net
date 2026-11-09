"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import { useSession } from "@/features/session";
import { DataTable, type Columna } from "@/shared/components/ui/DataTable";
import { useAhora } from "@/shared/hooks/useAhora";
import { formatoFecha } from "@/shared/utils/formato";
import type { OperacionResumen } from "@/features/operaciones/types/vistas";
import { BarraAvance, PillSituacion, Semaforo, TipoClienteBadge, TipoOperacionTag } from "@/features/operaciones/components/etiquetas";
import { LoginDateTimeDisplay } from "./LoginDateTimeDisplay";
import { KpiWidget } from "./KpiWidget";
import { PersonalizarWidgets } from "./PersonalizarWidgets";
import { WIDGET, WIDGETS, type WidgetElegido } from "../widgets";

export interface Pendiente {
  clave: string;
  tono: "riesgo" | "alerta" | "info";
  texto: string;
  detalle: string;
}

interface Props {
  operaciones: OperacionResumen[];
  widgets: WidgetElegido[];
  alertasActivas: string[];
  encargosPorVencer: { folio: string; razonSocial: string; vence: string }[];
}

const COLOR: Record<Pendiente["tono"], string> = { riesgo: "#dc2626", alerta: "#d97706", info: "#1d4ed8" };

export function HomeVista({ operaciones, widgets, alertasActivas, encargosPorVencer }: Props) {
  const router = useRouter();
  const ahora = useAhora();
  const { puede } = useSession();
  const [filtro, setFiltro] = useState<string | null>(null);
  const [personalizar, setPersonalizar] = useState(false);

  const conteos = useMemo(() => Object.fromEntries(WIDGETS.map((w) => [w.id, operaciones.filter((o) => w.cumple(o, ahora)).length])), [operaciones, ahora]);
  const elegidos = widgets.filter((w) => WIDGET(w.widget));
  const definicionFiltro = filtro ? WIDGET(filtro) : null;

  const pendientes = useMemo<Pendiente[]>(() => {
    const cuenta = (id: string) => conteos[id] ?? 0;
    const lista: (Pendiente | null)[] = [
      cuenta("reconocimiento") ? { clave: "semaforo_rojo", tono: "riesgo", texto: `${cuenta("reconocimiento")} en reconocimiento aduanero`, detalle: "Semáforo rojo esperando revisión" } : null,
      cuenta("por_pagar") ? { clave: "pedimento_por_pagar", tono: "alerta", texto: `${cuenta("por_pagar")} pedimento(s) por pagar`, detalle: "Validados y sin pago" } : null,
      cuenta("en_espera_cliente") ? { clave: "sin_cliente", tono: "alerta", texto: `${cuenta("en_espera_cliente")} operación(es) sin cliente`, detalle: "El pedimento queda bloqueado hasta asignarlo" } : null,
      cuenta("docs_rechazados") ? { clave: "documento_rechazado", tono: "riesgo", texto: `${cuenta("docs_rechazados")} operación(es) con documentos rechazados`, detalle: "Esperan una nueva versión" } : null,
      cuenta("proximo_llegar") ? { clave: "proximo_arribo", tono: "info", texto: `${cuenta("proximo_llegar")} arribo(s) en 48 h`, detalle: "Ten listos documentos y revalidación" } : null,
      encargosPorVencer.length ? { clave: "encargo_por_vencer", tono: "alerta", texto: `${encargosPorVencer.length} encargo(s) conferido(s) por vencer`, detalle: encargosPorVencer.slice(0, 2).map((e) => `${e.folio} · ${formatoFecha(e.vence)}`).join(", ") } : null,
    ];
    return lista.filter((p): p is Pendiente => p != null && alertasActivas.includes(p.clave));
  }, [conteos, encargosPorVencer, alertasActivas]);

  const columnas = useMemo<Columna<OperacionResumen>[]>(() => [
    { id: "folio", encabezado: "Folio", celda: (o) => <Link href={`/operaciones/${o.id}`} className="clp-mono font-semibold text-aduanaBlue hover:underline">{o.folio}</Link>, orden: (o) => o.folio, csv: (o) => o.folio },
    { id: "pedimento", encabezado: "Pedimento", celda: (o) => <span className="clp-mono">{o.numeroPedimento ?? "—"}</span>, orden: (o) => o.numeroPedimento, csv: (o) => o.numeroPedimento },
    { id: "cliente", encabezado: "Cliente", celda: (o) => o.clienteNombre ? <span className="block max-w-[16rem] truncate">{o.clienteNombre} {o.clienteTipo ? <TipoClienteBadge tipo={o.clienteTipo} /> : null}</span> : <span className="text-slate-500">Sin cliente</span>, orden: (o) => o.clienteNombre, csv: (o) => o.clienteNombre },
    { id: "tipo", encabezado: "Tipo", celda: (o) => <TipoOperacionTag tipo={o.tipo} />, orden: (o) => o.tipo, csv: (o) => o.tipo },
    { id: "eta", encabezado: "ETA", celda: (o) => formatoFecha(o.eta), orden: (o) => o.eta, csv: (o) => formatoFecha(o.eta), alinear: "der" },
    { id: "avance", encabezado: "Avance", celda: (o) => <BarraAvance {...o.avance} />, orden: (o) => o.avance.porcentaje },
    { id: "semaforo", encabezado: "Semáforo", celda: (o) => <Semaforo valor={o.semaforo} />, orden: (o) => o.semaforo, csv: (o) => o.semaforo ?? "" },
    { id: "situacion", encabezado: "Situación", celda: (o) => <PillSituacion situacion={o.situacion} />, orden: (o) => o.situacion, csv: (o) => o.situacion },
  ], []);

  return (
    <>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="clp-page-title">Control de Tráficos</h1>
          <LoginDateTimeDisplay />
        </div>
        <div className="flex gap-2">
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setPersonalizar(true)}><Settings2 className="h-4 w-4" /> Widgets</button>
          {puede("operaciones.operar") ? <Link href="/operaciones" className="clp-btn clp-btn-primary"><Plus className="h-4 w-4" /> Nueva operación</Link> : null}
        </div>
      </div>

      {elegidos.length ? (
        <div className="clp-kpis" style={{ gridTemplateColumns: `repeat(${elegidos.length}, minmax(0, 1fr))` }}>
          {elegidos.map((w) => (
            <KpiWidget key={w.widget} definicion={WIDGET(w.widget)!} eleccion={w} valor={conteos[w.widget] ?? 0} activo={filtro === w.widget} onClick={() => setFiltro(filtro === w.widget ? null : w.widget)} />
          ))}
        </div>
      ) : (
        <button type="button" className="w-full rounded-[10px] border-[1.5px] border-dashed border-linea p-6 text-sm text-slate-500" onClick={() => setPersonalizar(true)}>No tienes widgets. Pica aquí para elegir hasta 6.</button>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        <DataTable
          titulo={definicionFiltro ? <>Operaciones · <span className="font-normal text-slate-600">{definicionFiltro.titulo}</span> <button type="button" className="ml-1 text-xs font-semibold underline" onClick={() => setFiltro(null)}>quitar filtro</button></> : "Operaciones abiertas"}
          filas={operaciones}
          filtroExterno={definicionFiltro ? (o) => definicionFiltro.cumple(o, ahora) : (o) => o.estado !== "CERRADA"}
          columnas={columnas}
          idFila={(o) => o.id}
          textoBusqueda={(o) => [o.folio, o.clienteNombre, o.numeroPedimento, ...o.contenedores].filter(Boolean).join(" ")}
          placeholderBusqueda="Folio, cliente, pedimento o contenedor"
          nombreRegistros="operaciones"
          ordenInicial={{ columna: "folio", dir: "desc" }}
          porPagina={10}
          alPicarFila={(o) => router.push(`/operaciones/${o.id}`)}
          vacio={operaciones.length === 0 ? "Aún no hay operaciones." : "No hay operaciones en este indicador."}
        />
        <aside className="clp-card p-4">
          <h2 className="clp-section-title mb-2">Pendientes de hoy</h2>
          {pendientes.length ? (
            <ul className="divide-y divide-linea">
              {pendientes.map((p) => (
                <li key={p.clave} className="flex gap-3 py-2.5 text-sm">
                  <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: COLOR[p.tono] }} aria-hidden />
                  <div><div className="font-medium text-slate-800">{p.texto}</div><div className="text-xs text-slate-500">{p.detalle}</div></div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">Sin pendientes urgentes.</p>}
        </aside>
      </div>

      {personalizar ? <PersonalizarWidgets open onClose={() => setPersonalizar(false)} actuales={elegidos} conteos={conteos} /> : null}
    </>
  );
}
