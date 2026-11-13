"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, LayoutGrid, Pencil, Plus, Power, Trash2 } from "lucide-react";
import type { TipoCliente } from "@prisma/client";
import { useSession } from "@/features/session";
import { PillSituacion } from "@/features/operaciones/components/etiquetas";
import { SectionTabs, CLIENTES_TABS } from "@/shared/components/layout/SectionTabs";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useConfirmar } from "@/shared/components/ui/Confirmar";
import { DataTable, descargarCsv, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { Kebab, type AccionKebab } from "@/shared/components/ui/Kebab";
import { MorphModal, type DatosMorph } from "@/shared/components/ui/MorphModal";
import { Pill } from "@/shared/components/ui/Pill";
import { useAccion } from "@/shared/hooks/useAccion";
import { formatoFecha } from "@/shared/utils/formato";
import { validarRfc } from "@/shared/utils/validaciones";
import { cambiarEstadoClientes } from "../actions/clientes-actions";
import type { ClienteVista } from "../dal/clientes-dal";
import { obtenerEstadoDomicilio } from "../utils/clientes-utils";
import { RegistroCliente, type ForwarderOpcion } from "./RegistroCliente";

interface Props {
  tipo: TipoCliente;
  clientes: ClienteVista[];
  forwarders: ForwarderOpcion[];
  siguientesFolios: Record<TipoCliente, string>;
  hoy: string;
}

type EstadoEncargo = "vigente" | "por-vencer" | "vencido" | "sin";
const DIA = 86_400_000;

function estadoEncargo(c: ClienteVista, hoy: number): EstadoEncargo {
  if (!c.encargoConferido) return "sin";
  if (!c.fechaVigenciaEncargo) return "vigente";
  const vence = new Date(c.fechaVigenciaEncargo).getTime();
  if (vence < hoy) return "vencido";
  return vence - hoy <= 30 * DIA ? "por-vencer" : "vigente";
}

function textoEncargo(c: ClienteVista, hoy: number) {
  const e = estadoEncargo(c, hoy);
  if (e === "sin") return "Sin encargo";
  if (!c.fechaVigenciaEncargo) return "Vigente";
  return `${e === "vencido" ? "Vencido el" : e === "por-vencer" ? "Por vencer ·" : "Vigente al"} ${formatoFecha(c.fechaVigenciaEncargo)}`;
}

const persona = (rfc: string) => (validarRfc(rfc).persona === "FISICA" ? "Física" : "Moral");
const activo = (c: ClienteVista) => c.estado === "ACTIVO";
const PillEstado = ({ c }: { c: ClienteVista }) => <Pill tono={activo(c) ? "ok" : "neutro"}>{activo(c) ? "Activo" : "Inactivo"}</Pill>;
const PillPadron = ({ v }: { v: boolean | null }) => v === true ? <Pill tono="ok">Activo</Pill> : v === false ? <Pill tono="riesgo">Inactivo</Pill> : <Pill tono="neutro">Sin verificar</Pill>;

const Dato = ({ etiqueta, children, mono }: { etiqueta: string; children: ReactNode; mono?: boolean }) => (
  <div className="clp-dt-d"><small>{etiqueta}</small><span className={mono ? "clp-mono" : ""}>{children}</span></div>
);
const Bloque = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div className="clp-dt-b"><div className="clp-dt-t">{titulo}</div>{children}</div>
);

type Modo = { tipo: "lista" } | { tipo: "saliendo"; editando: ClienteVista | null } | { tipo: "registro"; editando: ClienteVista | null };

export function ClientesVista({ tipo, clientes, forwarders, siguientesFolios, hoy }: Props) {
  const router = useRouter();
  const { puede } = useSession();
  const confirmar = useConfirmar();
  const { ejecutar } = useAccion();
  const [modo, setModo] = useState<Modo>({ tipo: "lista" });
  const [volviendo, setVolviendo] = useState(false);
  const [resaltar, setResaltar] = useState<string | null>(null);
  const [morph, setMorph] = useState<{ origen: HTMLElement; cliente: ClienteVista } | null>(null);
  const hoyMs = new Date(hoy).getTime();
  const directo = tipo === "DIRECTO";
  const titulo = directo ? "Clientes Directos" : "Clientes Forwarder";
  const puedeEditar = puede("catalogos.editar");
  const puedeBaja = puede("catalogos.eliminar");
  const puedeOperar = puede("operaciones.operar");

  useEffect(() => {
    if (!resaltar) return;
    const t = setTimeout(() => setResaltar(null), 2200);
    return () => clearTimeout(t);
  }, [resaltar]);

  // La lista sale con una transición antes de mostrar el registro.
  const abrirRegistro = useCallback((editando: ClienteVista | null) => {
    setMorph(null);
    setModo({ tipo: "saliendo", editando });
    setTimeout(() => setModo({ tipo: "registro", editando }), 300);
  }, []);
  const volver = (guardado?: { folio: string }) => {
    setModo({ tipo: "lista" });
    setVolviendo(true);
    setTimeout(() => setVolviendo(false), 700);
    if (guardado) setResaltar(guardado.folio);
  };

  const nuevaOperacion = (c: ClienteVista) => router.push(`/operaciones?nueva=1&cliente=${c.id}`);

  const alternarEstado = async (c: ClienteVista) => {
    const baja = activo(c);
    const ok = await confirmar({
      titulo: `¿${baja ? "Marcar inactivo" : "Reactivar"} a ${c.razonSocial}?`,
      texto: baja ? "Ya no aparecerá al crear operaciones. Su historial y sus operaciones se conservan." : "Volverá a estar disponible en el sistema.",
      ok: baja ? "Marcar inactivo" : "Reactivar",
      peligro: baja,
    });
    if (!ok) return;
    ejecutar(async () => {
      const r = await cambiarEstadoClientes([c.id], baja ? "INACTIVO" : "ACTIVO");
      return r.ok ? { ...r, mensaje: baja ? `${c.razonSocial} quedó inactivo.` : `${c.razonSocial} se reactivó.` } : r;
    }, (bien) => bien && setResaltar(c.folio));
  };

  const acciones = (c: ClienteVista): AccionKebab[] => [
    ...(puedeEditar ? [{ icono: <Pencil aria-hidden />, texto: "Editar", alElegir: () => abrirRegistro(c) }] : []),
    ...(puedeOperar && activo(c) ? [{ icono: <Plus aria-hidden />, texto: "Nueva operación", alElegir: () => nuevaOperacion(c) }] : []),
    ...(puedeBaja ? [{ icono: activo(c) ? <Trash2 aria-hidden /> : <Power aria-hidden />, texto: activo(c) ? "Marcar inactivo" : "Reactivar", peligro: activo(c), alElegir: () => alternarEstado(c) }] : []),
  ];

  const botonesDetalle = (c: ClienteVista, antes?: () => void) => (
    <>
      {puedeEditar ? <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => { antes?.(); abrirRegistro(c); }}><Pencil className="h-4 w-4" />Editar</button> : null}
      {puedeOperar && activo(c) ? <button type="button" className="clp-btn clp-btn-primary clp-btn-sm" onClick={() => { antes?.(); nuevaOperacion(c); }}><Plus className="h-4 w-4" />Nueva operación</button> : null}
    </>
  );

  const detalleMorph = (c: ClienteVista): DatosMorph => ({
    icono: <Avatar texto={c.razonSocial} />,
    eyebrow: <>Cliente {directo ? "directo" : "forwarder"} · <span className="clp-mono">{c.folio}</span></>,
    titulo: c.razonSocial,
    pills: <PillEstado c={c} />,
    cuerpo: (
      <>
        <div className="clp-mm-col">
          <section>
            <div className="clp-mm-t">Datos fiscales</div>
            <div className="clp-mm-grid">
              <div className="clp-campo"><small>RFC</small><span className="clp-mono">{c.rfc}</span></div>
              <div className="clp-campo"><small>Persona</small>{persona(c.rfc)}</div>
              <div className="clp-campo ancho"><small>Domicilio fiscal</small>{c.domicilio}</div>
              {c.pdfConstanciaUrl ? <div className="clp-campo ancho"><small>Constancia fiscal</small><a className="clp-lnk-ver" href={c.pdfConstanciaUrl} target="_blank" rel="noreferrer">Ver PDF</a></div> : null}
            </div>
          </section>
          {directo ? (
            <section>
              <div className="clp-mm-t">Cumplimiento</div>
              <div className="clp-mm-grid">
                <div className="clp-campo"><small>Padrón de importadores</small><span><PillPadron v={c.padronImportadores} /></span></div>
                <div className="clp-campo"><small>Encargo conferido</small>{textoEncargo(c, hoyMs)}</div>
                {c.clientePadreNombre ? <div className="clp-campo ancho"><small>Forwarder que lo atiende</small>{c.clientePadreNombre}</div> : null}
              </div>
            </section>
          ) : null}
        </div>
        <div className="clp-mm-col">
          <div className="clp-mm-stats">
            <div><b>{c.operaciones}</b><small>Operaciones</small></div>
            <div><b>{c.ultimaOperacion ? formatoFecha(c.ultimaOperacion) : "—"}</b><small>Última operación</small></div>
          </div>
          <section>
            <div className="clp-mm-t">Operaciones recientes</div>
            {c.recientes.length ? (
              <ul className="clp-mm-ops">
                {c.recientes.map((o) => <li key={o.id}><Link href={`/operaciones/${o.id}`} className="clp-mono">{o.folio}</Link><PillSituacion situacion={o.situacion} /></li>)}
              </ul>
            ) : <p className="clp-mm-vacio">Sin operaciones abiertas.</p>}
          </section>
        </div>
      </>
    ),
    acciones: (cerrar) => botonesDetalle(c, () => cerrar({ inmediato: true })),
  });

  const tarjetas = (filas: ClienteVista[]) => (
    <div className="clp-mgrid">
      {filas.map((c, i) => (
        <article
          key={c.id}
          className={`clp-mcard ${activo(c) ? "" : "apagada"} ${resaltar === c.folio ? "nueva" : ""}`}
          style={{ "--i": i } as React.CSSProperties}
          tabIndex={0}
          role="button"
          aria-haspopup="dialog"
          aria-label={`${c.razonSocial}, ${c.folio}`}
          onClick={(e) => setMorph({ origen: e.currentTarget, cliente: c })}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); setMorph({ origen: e.currentTarget, cliente: c }); } }}
        >
          <div className="clp-mc-top">
            <Avatar texto={c.razonSocial} />
            <span className="clp-mc-der"><PillEstado c={c} /><Kebab acciones={acciones(c)} etiqueta={`Acciones de ${c.razonSocial}`} /></span>
          </div>
          <div className="clp-mc-cuerpo">
            <h4 className="clp-mc-nom">{c.razonSocial}</h4>
            <div className="clp-mc-rfc clp-mono">{c.rfc}</div>
          </div>
          <div className="clp-mc-pie">
            <div><small>Folio</small><b className="clp-mono">{c.folio}</b></div>
            <div className="der"><small>Operaciones activas</small><b>{c.operacionesAbiertas}</b></div>
          </div>
        </article>
      ))}
    </div>
  );

  const columnas = useMemo<Columna<ClienteVista>[]>(() => [
    { id: "folio", encabezado: "Folio", celda: (c) => <span className="clp-mono font-semibold">{c.folio}</span>, orden: (c) => c.folio, csv: (c) => c.folio },
    { id: "razon", encabezado: "Razón social", celda: (c) => <span className="inline-block max-w-[300px] truncate align-middle font-semibold">{c.razonSocial}</span>, orden: (c) => c.razonSocial, csv: (c) => c.razonSocial },
    { id: "rfc", encabezado: "RFC", celda: (c) => <span className="clp-mono">{c.rfc}</span>, orden: (c) => c.rfc, csv: (c) => c.rfc },
    { id: "ops", encabezado: "Operaciones", celda: (c) => c.operaciones, orden: (c) => c.operaciones, csv: (c) => c.operaciones, alinear: "der" },
    { id: "estado", encabezado: "Estado", celda: (c) => <PillEstado c={c} />, orden: (c) => c.estado, csv: (c) => (activo(c) ? "Activo" : "Inactivo") },
  ], []);

  // Exportar incluye todos los datos del cliente, no solo las columnas visibles.
  const columnasCsv: Columna<ClienteVista>[] = [
    ...columnas,
    { id: "persona", encabezado: "Persona", celda: () => null, csv: (c) => persona(c.rfc) },
    { id: "domicilio", encabezado: "Domicilio", celda: () => null, csv: (c) => c.domicilio },
    { id: "entidad", encabezado: "Estado (entidad)", celda: () => null, csv: (c) => obtenerEstadoDomicilio(c.domicilio) },
    ...(directo ? [
      { id: "padron", encabezado: "Padrón de importadores", celda: () => null, csv: (c: ClienteVista) => (c.padronImportadores == null ? "Sin verificar" : c.padronImportadores ? "Activo" : "Inactivo") },
      { id: "encargo", encabezado: "Encargo conferido", celda: () => null, csv: (c: ClienteVista) => textoEncargo(c, hoyMs) },
    ] : []),
    { id: "abiertas", encabezado: "Operaciones abiertas", celda: () => null, csv: (c) => c.operacionesAbiertas },
    { id: "ultima", encabezado: "Última operación", celda: () => null, csv: (c) => formatoFecha(c.ultimaOperacion) },
  ];

  const filtros = useMemo<FiltroRapido<ClienteVista>[]>(() => [
    { id: "activos", etiqueta: "Activos", cumple: activo },
    { id: "inactivos", etiqueta: "Inactivos", cumple: (c) => !activo(c) },
  ], []);

  const expandir = (c: ClienteVista) => (
    <>
      <Bloque titulo="Datos fiscales">
        <Dato etiqueta="RFC" mono>{c.rfc} · {persona(c.rfc)}</Dato>
        <Dato etiqueta="Domicilio fiscal">{c.domicilio}</Dato>
      </Bloque>
      {directo ? (
        <Bloque titulo="Cumplimiento">
          <Dato etiqueta="Padrón de importadores"><PillPadron v={c.padronImportadores} /></Dato>
          <Dato etiqueta="Encargo conferido">{textoEncargo(c, hoyMs)}</Dato>
          {c.clientePadreNombre ? <Dato etiqueta="Forwarder">{c.clientePadreNombre}</Dato> : null}
        </Bloque>
      ) : (
        <Bloque titulo="Forwarder">
          <Dato etiqueta="Estado"><PillEstado c={c} /></Dato>
          <Dato etiqueta="Importadores">Elige al importador final en cada operación</Dato>
        </Bloque>
      )}
      <Bloque titulo="Actividad">
        <Dato etiqueta="Operaciones">{c.operaciones}</Dato>
        <Dato etiqueta="Última operación">{c.ultimaOperacion ? formatoFecha(c.ultimaOperacion) : "—"}</Dato>
        <div className="clp-dt-acc">{botonesDetalle(c)}</div>
      </Bloque>
    </>
  );

  const marcarInactivos = async (seleccion: ClienteVista[], limpiar: () => void) => {
    const ids = seleccion.filter(activo).map((c) => c.id);
    if (!ids.length) return;
    const ok = await confirmar({
      titulo: `¿Marcar inactivos ${ids.length} cliente${ids.length === 1 ? "" : "s"}?`,
      texto: "Ya no aparecerán al crear operaciones. Su historial y sus operaciones se conservan.",
      ok: "Marcar inactivos",
      peligro: true,
    });
    if (!ok) return;
    ejecutar(async () => {
      const r = await cambiarEstadoClientes(ids, "INACTIVO");
      return r.ok ? { ...r, mensaje: `${r.data.cambiados} cliente${r.data.cambiados === 1 ? "" : "s"} quedaron inactivos.` } : r;
    }, (bien) => bien && limpiar());
  };

  if (modo.tipo === "registro") {
    return (
      <RegistroCliente
        key={modo.editando?.id ?? "nuevo"}
        tipoInicial={tipo}
        editando={modo.editando}
        forwarders={forwarders}
        siguientesFolios={siguientesFolios}
        onVolver={volver}
      />
    );
  }

  return (
    <div className={`clp-cli ${modo.tipo === "saliendo" ? "clp-rc-saliendo" : ""} ${volviendo ? "clp-rc-volviendo" : ""}`}>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">{titulo}</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => descargarCsv(directo ? "clientes-directos" : "clientes-forwarder", columnasCsv, clientes)}>
            <Download className="h-4 w-4" /> Exportar
          </button>
          {puedeEditar ? (
            <button type="button" className="clp-btn clp-btn-primary" onClick={() => abrirRegistro(null)}>
              <Plus className="h-4 w-4" /> Registrar cliente
            </button>
          ) : null}
        </div>
      </div>
      <SectionTabs label="Clientes" tabs={CLIENTES_TABS} />

      <DataTable
        className="clp-cli-tabla"
        filas={clientes}
        columnas={columnas}
        idFila={(c) => c.id}
        textoBusqueda={(c) => `${c.folio} ${c.razonSocial} ${c.rfc} ${c.domicilio}`}
        placeholderBusqueda="Folio, razón social, RFC o domicilio"
        nombreRegistros="clientes"
        filtros={filtros}
        ordenInicial={{ columna: "folio", dir: "asc" }}
        seleccionable={puedeBaja}
        accionesLote={puedeBaja ? (sel, limpiar) => sel.some(activo) ? <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={() => marcarInactivos(sel, limpiar)}>Marcar inactivos</button> : null : undefined}
        vistaAlterna={{ etiqueta: "Tarjetas", icono: <LayoutGrid aria-hidden />, porPagina: 8, render: tarjetas }}
        flotante
        expandir={expandir}
        vacio={clientes.length === 0 ? "Aún no hay clientes registrados." : undefined}
      />

      {morph ? <MorphModal key={morph.cliente.id} origen={morph.origen} datos={detalleMorph(morph.cliente)} alCerrar={() => setMorph(null)} /> : null}
    </div>
  );
}
