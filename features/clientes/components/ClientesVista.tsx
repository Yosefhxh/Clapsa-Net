"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { TipoCliente } from "@prisma/client";
import { useSession } from "@/features/session";
import { SectionTabs, CLIENTES_TABS } from "@/shared/components/layout/SectionTabs";
import { DataTable, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { Drawer } from "@/shared/components/ui/Drawer";
import { Pill } from "@/shared/components/ui/Pill";
import { useAccion } from "@/shared/hooks/useAccion";
import { formatoFecha } from "@/shared/utils/formato";
import { validarRfc } from "@/shared/utils/validaciones";
import { eliminarCliente } from "../actions/clientes-actions";
import type { ClienteVista } from "../dal/clientes-dal";
import { obtenerEstadoDomicilio } from "../utils/clientes-utils";
import { RegistroClienteDrawer } from "./RegistroClienteDrawer";

interface Props {
  tipo: TipoCliente;
  clientes: ClienteVista[];
  forwarders: { id: number; folio: string; razonSocial: string }[];
  hoy: string;
}

type EstadoEncargo = "vigente" | "por-vencer" | "vencido" | "sin";

function estadoEncargo(c: ClienteVista, hoy: number): EstadoEncargo {
  if (!c.encargoConferido) return "sin";
  if (!c.fechaVigenciaEncargo) return "vigente";
  const vence = new Date(c.fechaVigenciaEncargo).getTime();
  if (vence < hoy) return "vencido";
  return vence - hoy <= 30 * 86_400_000 ? "por-vencer" : "vigente";
}

const PILL_ENCARGO: Record<EstadoEncargo, { tono: "ok" | "alerta" | "riesgo" | "neutro"; texto: string }> = {
  vigente: { tono: "ok", texto: "Vigente" },
  "por-vencer": { tono: "alerta", texto: "Por vencer" },
  vencido: { tono: "riesgo", texto: "Vencido" },
  sin: { tono: "neutro", texto: "Sin encargo" },
};

export function ClientesVista({ tipo, clientes, forwarders, hoy }: Props) {
  const { puede } = useSession();
  const { ejecutar } = useAccion();
  const [registro, setRegistro] = useState<{ abierto: boolean; editando: ClienteVista | null }>({ abierto: false, editando: null });
  const [eliminando, setEliminando] = useState<ClienteVista | null>(null);
  const [estado, setEstado] = useState("");
  const hoyMs = new Date(hoy).getTime();
  const estados = useMemo(() => [...new Set(clientes.map((c) => obtenerEstadoDomicilio(c.domicilio)).filter(Boolean))].sort(), [clientes]);
  const titulo = tipo === "DIRECTO" ? "Clientes Directos" : "Clientes Forwarder";

  const columnas = useMemo<Columna<ClienteVista>[]>(() => [
    { id: "folio", encabezado: "Folio", celda: (c) => <span className="clp-mono font-semibold">{c.folio}</span>, orden: (c) => c.folio, csv: (c) => c.folio },
    {
      id: "razon", encabezado: "Razón social",
      celda: (c) => (
        <div className="max-w-[20rem]">
          <div className="truncate font-semibold">{c.razonSocial}</div>
          {c.clientePadreNombre ? <div className="truncate text-xs text-slate-500">Vía {c.clientePadreNombre}</div> : null}
        </div>
      ),
      orden: (c) => c.razonSocial, csv: (c) => c.razonSocial,
    },
    { id: "rfc", encabezado: "RFC", celda: (c) => <span className="clp-mono">{c.rfc}</span>, orden: (c) => c.rfc, csv: (c) => c.rfc },
    { id: "persona", encabezado: "Persona", celda: (c) => <span className="text-slate-500">{validarRfc(c.rfc).persona === "MORAL" ? "Moral" : "Física"}</span>, orden: (c) => c.rfc.length, csv: (c) => (validarRfc(c.rfc).persona === "MORAL" ? "Moral" : "Física") },
    { id: "domicilio", encabezado: "Domicilio", celda: (c) => <span className="block max-w-xs truncate" title={c.domicilio}>{c.domicilio}</span>, csv: (c) => c.domicilio },
    { id: "estado", encabezado: "Estado", celda: (c) => obtenerEstadoDomicilio(c.domicilio) || "-", orden: (c) => obtenerEstadoDomicilio(c.domicilio), csv: (c) => obtenerEstadoDomicilio(c.domicilio) },
    ...(tipo === "DIRECTO" ? [{
      id: "encargo", encabezado: "Encargo",
      celda: (c: ClienteVista) => { const e = PILL_ENCARGO[estadoEncargo(c, hoyMs)]; return <Pill tono={e.tono}>{e.texto}</Pill>; },
      orden: (c: ClienteVista) => estadoEncargo(c, hoyMs), csv: (c: ClienteVista) => PILL_ENCARGO[estadoEncargo(c, hoyMs)].texto,
    }] : []),
    { id: "ops", encabezado: "Operaciones", celda: (c) => <span className="tabular-nums">{c.operaciones}{c.operacionesAbiertas ? <span className="text-xs text-slate-500"> · {c.operacionesAbiertas} abiertas</span> : null}</span>, orden: (c) => c.operaciones, csv: (c) => c.operaciones, alinear: "der" },
    { id: "ultima", encabezado: "Última operación", celda: (c) => formatoFecha(c.ultimaOperacion), orden: (c) => c.ultimaOperacion, csv: (c) => formatoFecha(c.ultimaOperacion), alinear: "der" },
    {
      id: "acciones", encabezado: "Acciones", alinear: "der",
      celda: (c) => (
        <span className="inline-flex gap-1">
          {puede("catalogos.editar") ? <button type="button" className="clp-icon-btn" aria-label={`Editar ${c.razonSocial}`} title="Editar" onClick={() => setRegistro({ abierto: true, editando: c })}><Pencil className="h-4 w-4" /></button> : null}
          {puede("catalogos.eliminar") ? <button type="button" className="clp-icon-btn clp-icon-btn-danger" aria-label={`Eliminar ${c.razonSocial}`} title="Eliminar" onClick={() => setEliminando(c)}><Trash2 className="h-4 w-4" /></button> : null}
        </span>
      ),
    },
  ], [tipo, hoyMs, puede]);

  const filtros = useMemo<FiltroRapido<ClienteVista>[]>(() => [
    { id: "con-ops", etiqueta: "Con operaciones abiertas", cumple: (c) => c.operacionesAbiertas > 0 },
    ...(tipo === "DIRECTO" ? [
      { id: "encargo-problema", etiqueta: "Encargo vencido o por vencer", cumple: (c: ClienteVista) => ["vencido", "por-vencer"].includes(estadoEncargo(c, hoyMs)) },
      { id: "sin-padron", etiqueta: "Padrón sin verificar", cumple: (c: ClienteVista) => c.padronImportadores !== true },
    ] : []),
  ], [tipo, hoyMs]);

  return (
    <>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="clp-page-title">{titulo}</h1>
          <SectionTabs label="Clientes" tabs={CLIENTES_TABS} />
        </div>
        {puede("catalogos.editar") ? (
          <button type="button" className="clp-btn clp-btn-primary" onClick={() => setRegistro({ abierto: true, editando: null })}>
            <Plus className="h-4 w-4" /> {tipo === "DIRECTO" ? "Registrar cliente" : "Registrar forwarder"}
          </button>
        ) : null}
      </div>

      <DataTable
        filas={clientes}
        columnas={columnas}
        idFila={(c) => c.id}
        textoBusqueda={(c) => `${c.folio} ${c.razonSocial} ${c.rfc} ${c.domicilio}`}
        placeholderBusqueda="Folio, razón social, RFC o domicilio"
        nombreRegistros="clientes"
        filtros={filtros}
        filtroExterno={estado ? (c) => obtenerEstadoDomicilio(c.domicilio) === estado : null}
        ordenInicial={{ columna: "folio", dir: "desc" }}
        exportarComo={tipo === "DIRECTO" ? "clientes-directos" : "clientes-forwarder"}
        seleccionable
        extraToolbar={estados.length ? (
          <select className="clp-input !h-9 w-auto" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {estados.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        ) : null}
        vacio={clientes.length === 0 ? "Aún no hay clientes registrados." : undefined}
      />

      {registro.abierto ? (
        <RegistroClienteDrawer key={registro.editando?.id ?? "nuevo"} open onClose={() => setRegistro({ abierto: false, editando: null })} tipo={tipo} editando={registro.editando} forwarders={forwarders} />
      ) : null}

      <Drawer
        open={eliminando != null}
        onClose={() => setEliminando(null)}
        title="Eliminar cliente"
        subtitle={eliminando ? `${eliminando.folio} · ${eliminando.razonSocial}` : ""}
        footer={
          <>
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setEliminando(null)}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-danger" onClick={() => ejecutar(() => eliminarCliente(eliminando!.id), (ok) => ok && setEliminando(null))}>Eliminar definitivamente</button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {eliminando?.operaciones ? `Este cliente tiene ${eliminando.operaciones} operación(es): no se podrá eliminar para conservar el historial.` : "Se borrará del catálogo. Esta acción no se puede deshacer."}
        </p>
      </Drawer>
    </>
  );
}
