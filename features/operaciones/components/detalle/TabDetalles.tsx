"use client";

import { useState } from "react";
import { Clock, Loader2, Plus, Trash2 } from "lucide-react";
import type { ClavePedimento } from "@prisma/client";
import { useSession } from "@/features/session";
import { useAccion } from "@/shared/hooks/useAccion";
import { aInputFechaHora, formatoFechaHora } from "@/shared/utils/formato";
import {
  actualizarDatosAction,
  agregarContenedorAction,
  asignarClienteAction,
  quitarContenedorAction,
} from "../../actions/operaciones-actions";
import { ETIQUETA_MEDIO, type OpcionCliente, type OperacionDetalle } from "../../types/vistas";
import { SelectorClienteImportador, ValidacionesImportador, encargoVigente } from "../SelectorClienteImportador";

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="clp-dato min-w-0">
      <div className="text-xs text-slate-500">{etiqueta}</div>
      <div className="truncate text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

function AsignacionCliente({ op, opciones }: { op: OperacionDetalle; opciones: OpcionCliente[] }) {
  const { puede } = useSession();
  const { pendiente, ejecutar } = useAccion();
  const [valor, setValor] = useState({ clienteId: op.cliente?.id ?? null, importadorId: op.importador?.id ?? null });
  const importador = opciones.find((c) => c.id === valor.importadorId);
  const editable = puede("operaciones.operar") && op.estado !== "CERRADA";
  const sinCambios = valor.clienteId === (op.cliente?.id ?? null) && valor.importadorId === (op.importador?.id ?? null);

  return (
    <section className="mt-5">
      <h3 className="clp-section-title mb-3">Cliente e importador</h3>
      <SelectorClienteImportador opciones={opciones} clienteId={valor.clienteId} importadorId={valor.importadorId} onChange={setValor} deshabilitado={!editable} />
      <div className="mt-3 flex flex-col gap-3 border-t border-linea pt-3 md:flex-row md:items-center md:justify-between">
        {importador ? <ValidacionesImportador importador={importador} /> : <span className="text-sm text-slate-500">Al asignar se revisan el padrón de importadores y el encargo conferido.</span>}
        {editable ? (
          <button
            type="button"
            className="clp-btn clp-btn-primary shrink-0"
            disabled={pendiente || !valor.clienteId || !valor.importadorId || sinCambios}
            onClick={() => ejecutar(() => asignarClienteAction(op.id, valor.clienteId!, valor.importadorId))}
          >
            {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {op.cliente ? "Cambiar asignación" : "Guardar asignación"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DatosDespacho({ op, claves }: { op: OperacionDetalle; claves: ClavePedimento[] }) {
  const { puede } = useSession();
  const { pendiente, ejecutar } = useAccion();
  const editable = puede("operaciones.operar") && op.estado !== "CERRADA";
  const inicial = {
    folioManual: op.folioManual ?? "",
    eta: aInputFechaHora(op.eta),
    etd: aInputFechaHora(op.etd),
    clavePedimento: op.clavePedimento ?? "",
    blGuia: op.blGuia ?? "",
    naviera: op.naviera ?? "",
    puertoOrigen: op.puertoOrigen ?? "",
    incoterm: op.incoterm ?? "",
    valorFactura: op.valorFactura?.toString() ?? "",
    monedaFactura: (op.monedaFactura as "USD" | "MXN" | "EUR") ?? "USD",
    vendedorExtranjero: op.vendedorExtranjero ?? "",
    fracciones: op.fracciones ?? "",
  };
  const [form, setForm] = useState(inicial);
  const cambio = JSON.stringify(form) !== JSON.stringify(inicial);
  const set = (k: keyof typeof inicial) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const esMar = op.medio === "MARITIMO";

  const campos: { k: keyof typeof inicial; etiqueta: string; tipo?: string; ayuda?: string }[] = [
    { k: "blGuia", etiqueta: esMar ? "BL" : "Guía" },
    { k: "naviera", etiqueta: esMar ? "Naviera" : "Transportista / aerolínea" },
    { k: "puertoOrigen", etiqueta: "Puerto de origen" },
    { k: "incoterm", etiqueta: "Incoterm", ayuda: "EXW, FOB, CIF, DAP…" },
    { k: "eta", etiqueta: "ETA", tipo: "datetime-local" },
    { k: "etd", etiqueta: "ETD", tipo: "datetime-local" },
    { k: "vendedorExtranjero", etiqueta: op.tipo === "IMPO" ? "Vendedor extranjero" : "Comprador extranjero", ayuda: "Dato de la factura. No es un proveedor de CLAPSA." },
    { k: "fracciones", etiqueta: "Fracciones arancelarias", ayuda: "Separadas por coma" },
    { k: "folioManual", etiqueta: "Referencia del cliente" },
  ];

  return (
    <section className="mt-6">
      <h3 className="clp-section-title mb-3">Datos de despacho</h3>
      <fieldset disabled={!editable} className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="clp-label" htmlFor="dd-clave">Clave de pedimento</label>
          <select id="dd-clave" className="clp-input" value={form.clavePedimento} onChange={set("clavePedimento")}>
            <option value="">Sin definir</option>
            {claves.filter((c) => (op.tipo === "IMPO" ? c.aplicaImpo : c.aplicaExpo)).map((c) => <option key={c.clave} value={c.clave}>{c.clave} · {c.descripcion}</option>)}
          </select>
        </div>
        {campos.map((c) => (
          <div key={c.k}>
            <label className="clp-label" htmlFor={`dd-${c.k}`}>{c.etiqueta}</label>
            <input id={`dd-${c.k}`} className="clp-input" type={c.tipo ?? "text"} value={form[c.k]} onChange={set(c.k)} maxLength={200} />
            {c.ayuda ? <p className="clp-ayuda">{c.ayuda}</p> : null}
          </div>
        ))}
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <div>
            <label className="clp-label" htmlFor="dd-valor">Valor factura</label>
            <input id="dd-valor" className="clp-input tabular-nums" inputMode="decimal" value={form.valorFactura} onChange={set("valorFactura")} />
          </div>
          <div>
            <label className="clp-label" htmlFor="dd-moneda">Moneda</label>
            <select id="dd-moneda" className="clp-input" value={form.monedaFactura} onChange={set("monedaFactura")}>
              <option>USD</option><option>MXN</option><option>EUR</option>
            </select>
          </div>
        </div>
      </fieldset>
      {editable ? (
        <div className="mt-3 flex justify-end gap-2">
          {cambio ? <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setForm(inicial)}>Descartar</button> : null}
          <button type="button" className="clp-btn clp-btn-primary" disabled={!cambio || pendiente} onClick={() => ejecutar(() => actualizarDatosAction(op.id, { ...form, eta: form.eta || null, etd: form.etd || null }))}>
            {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar datos
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Contenedores({ op }: { op: OperacionDetalle }) {
  const { puede } = useSession();
  const { pendiente, ejecutar } = useAccion();
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState("40' HC");
  const editable = puede("operaciones.operar") && op.estado !== "CERRADA";

  return (
    <section className="mt-6">
      <h3 className="clp-section-title mb-3">Contenedores</h3>
      {op.contenedores.length ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {op.contenedores.map((c) => (
            <li key={c.id} className="clp-fila flex items-center gap-2 py-1 pl-3 pr-1 text-sm">
              <span className="clp-mono font-semibold">{c.numero}</span>
              {c.tipo ? <span className="text-xs text-slate-500">{c.tipo}</span> : null}
              {editable ? (
                <button type="button" className="clp-icon-btn clp-icon-btn-danger !h-7 !w-7" aria-label={`Quitar ${c.numero}`} onClick={() => ejecutar(() => quitarContenedorAction(op.id, c.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="mb-3 text-sm text-slate-500">Sin contenedores registrados.</p>}
      {editable ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); ejecutar(() => agregarContenedorAction(op.id, numero, tipo), (ok) => ok && setNumero("")); }}
        >
          <div>
            <label className="clp-label" htmlFor="cont-num">Número</label>
            <input id="cont-num" className="clp-input clp-mono w-44 uppercase" placeholder="MSKU1234565" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div>
            <label className="clp-label" htmlFor="cont-tipo">Tipo</label>
            <select id="cont-tipo" className="clp-input w-32" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>20&apos; DC</option><option>40&apos; DC</option><option>40&apos; HC</option><option>40&apos; RF</option>
            </select>
          </div>
          <button type="submit" className="clp-btn clp-btn-secondary" disabled={!numero.trim() || pendiente}><Plus className="h-4 w-4" /> Agregar</button>
        </form>
      ) : null}
      <p className="clp-ayuda">Se valida el dígito verificador (ISO 6346).</p>
    </section>
  );
}

function PanelProximoPaso({ op }: { op: OperacionDetalle }) {
  const siguiente = op.pasos.find((p) => (p.estado === "EN_PROCESO" || p.estado === "RECONOCIMIENTO" || p.estado === "PENDIENTE") && !p.bloqueo);
  const alertas = [
    !op.cliente ? "Sin cliente asignado." : null,
    !op.documentosObligatoriosAprobados ? "Hay documentos obligatorios sin aprobar." : null,
    op.importador && !encargoVigente(op.importador) ? "El encargo conferido del importador no está vigente." : null,
    op.importador?.padronImportadores === false ? "El importador no está activo en el padrón." : null,
    op.documentos.some((d) => d.estado === "RECHAZADO") ? "Hay documentos rechazados esperando nueva versión." : null,
  ].filter(Boolean) as string[];
  const checks = [
    { ok: !!op.cliente && !!op.importador, texto: "Cliente e importador asignados" },
    { ok: op.importador?.padronImportadores === true, texto: "Importador activo en el padrón" },
    { ok: !!op.importador && encargoVigente(op.importador), texto: "Encargo conferido vigente" },
    { ok: op.documentosObligatoriosAprobados, texto: "Documentos obligatorios aprobados" },
    { ok: op.pasos.find((p) => p.clave === "CLASIFICACION")?.estado === "COMPLETADO", texto: "Mercancía clasificada" },
  ];

  return (
    <aside className="clp-panel-azul space-y-3">
      <div>
        <div className="text-sm text-white/75">Próximo paso a dar</div>
        <div className="text-xl font-semibold">{op.estado === "CERRADA" ? "Operación cerrada" : !op.cliente ? "Asignar cliente e importador" : !op.documentosObligatoriosAprobados ? "Aprobar documentos obligatorios" : siguiente?.nombre ?? "Revisar pasos bloqueados"}</div>
      </div>
      {alertas.length ? (
        <div className="space-y-2">
          <div className="text-sm text-white/75">Alertas pendientes</div>
          {alertas.map((a) => <div key={a} className="rounded-md bg-white/10 px-3 py-2 text-sm">{a}</div>)}
        </div>
      ) : null}
      <div className="space-y-2 border-t border-white/15 pt-3">
        <div className="text-sm text-white/75">Para poder hacer el pedimento</div>
        {checks.map((c) => <div key={c.texto} className="clp-check"><i data-ok={c.ok}>{c.ok ? "✓" : ""}</i>{c.texto}</div>)}
      </div>
    </aside>
  );
}

export function TabDetalles({ op, opciones, claves }: { op: OperacionDetalle; opciones: OpcionCliente[]; claves: ClavePedimento[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <section className="clp-card p-5">
        {op.estado === "EN_ESPERA_CLIENTE" ? (
          <div className="clp-aviso-info mb-5">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div className="text-sm text-slate-600">
              <b>Operación en espera de cliente</b>
              Puedes recibir y revisar documentos, clasificar y seguir el arribo. El pedimento y lo que sigue quedan bloqueados hasta asignar cliente e importador.
            </div>
          </div>
        ) : null}
        <h3 className="clp-section-title mb-3">Detalles del Embarque</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Aduana">{op.aduana}</Campo>
          <Campo etiqueta="Tipo de operación">{op.tipo}</Campo>
          <Campo etiqueta="Medio de transporte">{ETIQUETA_MEDIO[op.medio]}</Campo>
          <Campo etiqueta="ETA">{formatoFechaHora(op.eta)}</Campo>
          <Campo etiqueta={op.cliente?.tipo === "FORWARDER" ? "RFC del importador" : "RFC del cliente"}><span className="clp-mono">{op.importador?.rfc ?? "-"}</span></Campo>
          <Campo etiqueta="Ejecutivo">{op.ejecutivo ?? "-"}</Campo>
          <Campo etiqueta="Abierta">{formatoFechaHora(op.creadaEn)}</Campo>
          <Campo etiqueta="Cerrada">{formatoFechaHora(op.cerradaEn)}</Campo>
        </div>
        <AsignacionCliente key={`${op.cliente?.id}-${op.importador?.id}`} op={op} opciones={opciones} />
        <DatosDespacho key={op.eventos.length} op={op} claves={claves} />
        <Contenedores op={op} />
      </section>
      <PanelProximoPaso op={op} />
    </div>
  );
}
