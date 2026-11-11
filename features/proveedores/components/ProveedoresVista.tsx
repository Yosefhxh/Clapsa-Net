"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useSession } from "@/features/session";
import { DataTable, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { Drawer } from "@/shared/components/ui/Drawer";
import { useAccion } from "@/shared/hooks/useAccion";
import { obtenerEstadoDesdeDireccion } from "@/shared/utils/estadosMexico";
import { formatoFecha, formatoMoneda } from "@/shared/utils/formato";
import { eliminarProveedorAction } from "../actions/proveedores";
import type { ProveedorVista } from "../dal/proveedores-dal";
import { ETIQUETA_TIPO_PROVEEDOR } from "../types";
import { RegistroProveedorDrawer, type PasoServicio } from "./RegistroProveedorDrawer";

interface Props {
  proveedores: ProveedorVista[];
  pasos: PasoServicio[];
  aduanas: string[];
}

export function ProveedoresVista({ proveedores, pasos, aduanas }: Props) {
  const { puede } = useSession();
  const { ejecutar } = useAccion();
  const [registro, setRegistro] = useState<{ abierto: boolean; editando: ProveedorVista | null }>({ abierto: false, editando: null });
  const [ficha, setFicha] = useState<ProveedorVista | null>(null);
  const [eliminando, setEliminando] = useState<ProveedorVista | null>(null);
  const [estado, setEstado] = useState("");
  const estados = useMemo(() => [...new Set(proveedores.map((p) => obtenerEstadoDesdeDireccion(p.direccion)).filter(Boolean))].sort(), [proveedores]);

  // Mismas columnas que antes: Razón social, Tipo, RFC, Dirección, Fecha y Acciones.
  const columnas = useMemo<Columna<ProveedorVista>[]>(() => [
    {
      id: "razon", encabezado: "Razón social",
      celda: (p) => (
        <div className="max-w-[20rem]">
          <div className="truncate font-semibold">{p.razonSocial}</div>
          <div className="truncate text-xs text-slate-500">{p.servicios.length ? p.servicios.map((s) => s.nombre).join(" · ") : "Sin servicios"}</div>
        </div>
      ),
      orden: (p) => p.razonSocial, csv: (p) => p.razonSocial,
    },
    { id: "tipo", encabezado: "Tipo", celda: (p) => <span className="clp-chip">{ETIQUETA_TIPO_PROVEEDOR[p.tipoProveedor]}</span>, orden: (p) => p.tipoProveedor, csv: (p) => ETIQUETA_TIPO_PROVEEDOR[p.tipoProveedor] },
    { id: "rfc", encabezado: "RFC", celda: (p) => <span className="clp-mono">{p.rfc}</span>, orden: (p) => p.rfc, csv: (p) => p.rfc },
    { id: "direccion", encabezado: "Dirección", celda: (p) => <span className="block max-w-xs truncate" title={p.direccion}>{p.direccion}</span>, orden: (p) => obtenerEstadoDesdeDireccion(p.direccion), csv: (p) => p.direccion },
    { id: "fecha", encabezado: "Fecha", celda: (p) => formatoFecha(p.fechaAlta), orden: (p) => p.fechaAlta, csv: (p) => formatoFecha(p.fechaAlta), alinear: "der" },
    {
      id: "acciones", encabezado: "Acciones", alinear: "der",
      celda: (p) => (
        <span className="inline-flex gap-1">
          <button type="button" className="clp-icon-btn" title="Ver ficha" aria-label={`Ver ficha de ${p.razonSocial}`} onClick={() => setFicha(p)}><Eye className="h-4 w-4" /></button>
          {puede("catalogos.editar") ? <button type="button" className="clp-icon-btn" title="Editar" aria-label={`Editar ${p.razonSocial}`} onClick={() => setRegistro({ abierto: true, editando: p })}><Pencil className="h-4 w-4" /></button> : null}
          {puede("catalogos.eliminar") ? <button type="button" className="clp-icon-btn clp-icon-btn-danger" title="Eliminar" aria-label={`Eliminar ${p.razonSocial}`} onClick={() => setEliminando(p)}><Trash2 className="h-4 w-4" /></button> : null}
        </span>
      ),
    },
  ], [puede]);

  const filtros = useMemo<FiltroRapido<ProveedorVista>[]>(() => [
    { id: "LOGISTICA", etiqueta: "Logística", cumple: (p) => p.tipoProveedor === "LOGISTICA" },
    { id: "ADUANAL", etiqueta: "Aduanal", cumple: (p) => p.tipoProveedor === "ADUANAL" },
    { id: "GENERALES", etiqueta: "Generales", cumple: (p) => p.tipoProveedor === "GENERALES" },
    { id: "sin-servicios", etiqueta: "Sin servicios", cumple: (p) => p.servicios.length === 0 },
  ], []);

  return (
    <>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="clp-page-title">Proveedores</h1>
        </div>
        {puede("catalogos.editar") ? (
          <button type="button" className="clp-btn clp-btn-primary" onClick={() => setRegistro({ abierto: true, editando: null })}>
            <Plus className="h-4 w-4" /> Registrar proveedor
          </button>
        ) : null}
      </div>

      <DataTable
        filas={proveedores}
        columnas={columnas}
        idFila={(p) => p.id}
        textoBusqueda={(p) => `${p.razonSocial} ${p.rfc} ${p.direccion} ${p.correo} ${p.servicios.map((s) => s.nombre).join(" ")}`}
        placeholderBusqueda="Razón social, RFC, dirección o servicio"
        nombreRegistros="proveedores"
        filtros={filtros}
        filtroExterno={estado ? (p) => obtenerEstadoDesdeDireccion(p.direccion) === estado : null}
        ordenInicial={{ columna: "fecha", dir: "desc" }}
        exportarComo="proveedores"
        extraToolbar={
          estados.length ? (
            <select className="clp-input !h-9 w-auto" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              {estados.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          ) : null
        }
        vacio={proveedores.length === 0 ? "No hay proveedores registrados. Usa “Registrar proveedor” para agregar uno." : undefined}
      />

      {registro.abierto ? (
        <RegistroProveedorDrawer
          key={registro.editando?.id ?? "nuevo"}
          open
          onClose={() => setRegistro({ abierto: false, editando: null })}
          pasos={pasos}
          aduanas={aduanas}
          editando={registro.editando}
        />
      ) : null}

      <Drawer
        open={ficha != null}
        onClose={() => setFicha(null)}
        title={ficha?.razonSocial ?? ""}
        subtitle={ficha ? `${ETIQUETA_TIPO_PROVEEDOR[ficha.tipoProveedor]} · RFC ${ficha.rfc} · Alta ${formatoFecha(ficha.fechaAlta)}${ficha.fuenteAlta === "CONSTANCIA" ? " · desde constancia" : ""}` : ""}
        footer={ficha && puede("catalogos.editar") ? <button type="button" className="clp-btn clp-btn-primary" onClick={() => { setRegistro({ abierto: true, editando: ficha }); setFicha(null); }}><Pencil className="h-4 w-4" /> Editar</button> : undefined}
      >
        {ficha ? (
          <>
            <section className="clp-grupo">
              <h3 className="clp-grupo-titulo">Servicios y tarifas</h3>
              {ficha.servicios.length ? (
                <ul className="divide-y divide-linea rounded-lg border border-linea">
                  {ficha.servicios.map((s) => (
                    <li key={s.pasoId} className="flex justify-between px-3 py-2 text-sm"><span>{s.nombre}</span><span className="clp-mono">{s.tarifa != null ? formatoMoneda(s.tarifa) : "Sin tarifa"}</span></li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-500">Sin servicios: no aparece al asignar proveedor en las operaciones.</p>}
            </section>
            <section className="clp-grupo">
              <h3 className="clp-grupo-titulo">Cobertura y contacto</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="clp-dato"><div className="text-xs text-slate-500">Aduanas</div><div className="text-sm font-medium">{ficha.aduanas.length ? ficha.aduanas.join(", ") : "Todas"}</div></div>
                <div className="clp-dato"><div className="text-xs text-slate-500">Correo</div><div className="truncate text-sm font-medium">{ficha.correo}</div></div>
                <div className="clp-dato"><div className="text-xs text-slate-500">Teléfono</div><div className="clp-mono text-sm font-medium">{ficha.telefono}</div></div>
                <div className="clp-dato sm:col-span-2"><div className="text-xs text-slate-500">Dirección</div><div className="text-sm font-medium">{ficha.direccion}</div></div>
              </div>
            </section>
            <section className="clp-grupo">
              <h3 className="clp-grupo-titulo">Uso en operaciones</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="clp-dato"><div className="text-xl font-bold text-aduanaBlue tabular-nums">{ficha.serviciosEsteAnio}</div><div className="text-xs text-slate-500">Servicios este año</div></div>
                <div className="clp-dato"><div className="text-xl font-bold text-aduanaBlue tabular-nums">{ficha.operacionesActivas}</div><div className="text-xs text-slate-500">En operaciones abiertas</div></div>
              </div>
            </section>
          </>
        ) : null}
      </Drawer>

      <Drawer
        open={eliminando != null}
        onClose={() => setEliminando(null)}
        title="Eliminar proveedor"
        subtitle={eliminando?.razonSocial}
        footer={
          <>
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setEliminando(null)}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-danger" onClick={() => ejecutar(() => eliminarProveedorAction(eliminando!.id), (ok) => ok && setEliminando(null))}>Eliminar definitivamente</button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Se borran sus servicios y tarifas. Las operaciones cerradas conservan el costo que se registró. Si está asignado en una operación abierta, no se podrá eliminar.</p>
      </Drawer>
    </>
  );
}
