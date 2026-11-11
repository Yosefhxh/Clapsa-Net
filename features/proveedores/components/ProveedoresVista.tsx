"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, ExternalLink, FileText, LayoutGrid, Pencil, Plus, Power, Trash2 } from "lucide-react";
import type { TipoProveedor } from "@prisma/client";
import { useSession } from "@/features/session";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useConfirmar } from "@/shared/components/ui/Confirmar";
import { DataTable, descargarCsv, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { Kebab, type AccionKebab } from "@/shared/components/ui/Kebab";
import { MorphModal, type DatosMorph } from "@/shared/components/ui/MorphModal";
import { Pill } from "@/shared/components/ui/Pill";
import { useAccion } from "@/shared/hooks/useAccion";
import { formatoFecha, formatoMoneda } from "@/shared/utils/formato";
import { validarRfc } from "@/shared/utils/validaciones";
import { cambiarEstadoProveedores } from "../actions/proveedores";
import type { ProveedorVista } from "../dal/proveedores-dal";
import { CLASE_TIPO_PROVEEDOR, ETIQUETA_TIPO_PROVEEDOR, type PasoServicio } from "../types";
import { RegistroProveedor } from "./RegistroProveedor";

interface Props {
  proveedores: ProveedorVista[];
  pasos: PasoServicio[];
  aduanas: string[];
}

const activo = (p: ProveedorVista) => p.estado === "ACTIVO";
const persona = (rfc: string) => (validarRfc(rfc).persona === "FISICA" ? "Física" : "Moral");
const tarifaDesde = (p: ProveedorVista) => {
  const t = p.servicios.map((s) => s.tarifa).filter((x): x is number => x != null);
  return t.length ? Math.min(...t) : null;
};
const textoAduanas = (p: ProveedorVista) => (p.aduanas.length ? p.aduanas.join(", ") : "Todas");

export const Categoria = ({ tipo }: { tipo: TipoProveedor }) => <span className={`clp-cat clp-cat-${CLASE_TIPO_PROVEEDOR[tipo]}`}>{ETIQUETA_TIPO_PROVEEDOR[tipo]}</span>;
const PillEstado = ({ p }: { p: ProveedorVista }) => <Pill tono={activo(p) ? "ok" : "neutro"}>{activo(p) ? "Activo" : "Inactivo"}</Pill>;

const Dato = ({ etiqueta, children, mono }: { etiqueta: string; children: ReactNode; mono?: boolean }) => (
  <div className="clp-dt-d"><small>{etiqueta}</small><span className={mono ? "clp-mono" : ""}>{children}</span></div>
);
const Bloque = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div className="clp-dt-b"><div className="clp-dt-t">{titulo}</div>{children}</div>
);

type Modo = { tipo: "lista" } | { tipo: "saliendo"; editando: ProveedorVista | null } | { tipo: "registro"; editando: ProveedorVista | null; n: number };

export function ProveedoresVista({ proveedores, pasos, aduanas }: Props) {
  const { puede } = useSession();
  const confirmar = useConfirmar();
  const { ejecutar } = useAccion();
  const [modo, setModo] = useState<Modo>({ tipo: "lista" });
  const [volviendo, setVolviendo] = useState(false);
  const [resaltar, setResaltar] = useState<number | null>(null);
  const [morph, setMorph] = useState<{ origen: HTMLElement; proveedor: ProveedorVista; doc?: boolean } | null>(null);
  const puedeEditar = puede("catalogos.editar");
  const puedeBaja = puede("catalogos.eliminar");

  useEffect(() => {
    if (resaltar == null) return;
    const t = setTimeout(() => setResaltar(null), 2200);
    return () => clearTimeout(t);
  }, [resaltar]);

  // La lista sale con una transición antes de mostrar el registro.
  const abrirRegistro = useCallback((editando: ProveedorVista | null) => {
    setMorph(null);
    setModo({ tipo: "saliendo", editando });
    setTimeout(() => setModo({ tipo: "registro", editando, n: 0 }), 300);
  }, []);
  const volver = (guardado?: { id: number; otro: boolean }) => {
    if (guardado?.otro) { setModo((m) => ({ tipo: "registro", editando: null, n: (m.tipo === "registro" ? m.n : 0) + 1 })); return; }
    setModo({ tipo: "lista" });
    setVolviendo(true);
    setTimeout(() => setVolviendo(false), 700);
    if (guardado) setResaltar(guardado.id);
  };

  // La constancia crece desde la tarjeta o la fila del proveedor.
  const verConstancia = (p: ProveedorVista, origen?: HTMLElement | null) => {
    const el = origen ?? document.querySelector<HTMLElement>(`[data-proveedor="${p.id}"]`);
    if (el) setMorph({ origen: el, proveedor: p, doc: true });
    else if (p.pdfConstanciaUrl) window.open(p.pdfConstanciaUrl, "_blank", "noreferrer");
  };

  const alternarEstado = async (p: ProveedorVista) => {
    const baja = activo(p);
    const ok = await confirmar({
      titulo: `¿${baja ? "Dar de baja" : "Reactivar"} a ${p.razonSocial}?`,
      texto: baja ? "Quedará inactivo: ya no aparecerá al asignar proveedor. Su historial en operaciones se conserva." : "Volverá a estar disponible en el sistema.",
      ok: baja ? "Dar de baja" : "Reactivar",
      peligro: baja,
    });
    if (!ok) return;
    ejecutar(async () => {
      const r = await cambiarEstadoProveedores([p.id], baja ? "INACTIVO" : "ACTIVO");
      return r.ok ? { ...r, mensaje: baja ? `${p.razonSocial} quedó inactivo.` : `${p.razonSocial} se reactivó.` } : r;
    }, (bien) => bien && setResaltar(p.id));
  };

  const acciones = (p: ProveedorVista): AccionKebab[] => [
    ...(puedeEditar ? [{ icono: <Pencil aria-hidden />, texto: "Editar", alElegir: () => abrirRegistro(p) }] : []),
    ...(p.pdfConstanciaUrl ? [{ icono: <Download aria-hidden />, texto: "Constancia fiscal", alElegir: () => verConstancia(p) }] : []),
    ...(puedeBaja ? [{ icono: activo(p) ? <Trash2 aria-hidden /> : <Power aria-hidden />, texto: activo(p) ? "Dar de baja" : "Reactivar", peligro: activo(p), alElegir: () => alternarEstado(p) }] : []),
  ];

  const botonesDetalle = (p: ProveedorVista, antes?: () => void, pequenos?: boolean) => (
    <>
      {p.pdfConstanciaUrl ? (
        <button type="button" className={`clp-btn clp-btn-secondary ${pequenos ? "clp-btn-sm" : ""}`} onClick={(e) => { const fila = (e.currentTarget.closest("[data-proveedor]") ?? e.currentTarget.closest("tr")?.previousElementSibling) as HTMLElement | null; antes?.(); verConstancia(p, fila); }}>
          <FileText className="h-4 w-4" />{pequenos ? "Constancia" : "Constancia fiscal"}
        </button>
      ) : null}
      {puedeEditar ? <button type="button" className={`clp-btn clp-btn-primary ${pequenos ? "clp-btn-sm" : ""}`} onClick={() => { antes?.(); abrirRegistro(p); }}><Pencil className="h-4 w-4" />Editar</button> : null}
    </>
  );

  const detalleMorph = (p: ProveedorVista): DatosMorph => ({
    icono: <Avatar texto={p.razonSocial} />,
    eyebrow: `Proveedor · ${ETIQUETA_TIPO_PROVEEDOR[p.tipoProveedor]}`,
    titulo: p.razonSocial,
    pills: <PillEstado p={p} />,
    cuerpo: (
      <>
        <div className="clp-mm-col">
          <section>
            <div className="clp-mm-t">Datos fiscales</div>
            <div className="clp-mm-grid">
              <div className="clp-campo"><small>RFC</small><span className="clp-mono">{p.rfc}</span></div>
              <div className="clp-campo"><small>Alta</small>{formatoFecha(p.fechaAlta)}{p.fuenteAlta === "CONSTANCIA" ? " · desde constancia" : ""}</div>
              <div className="clp-campo ancho"><small>Dirección</small>{p.direccion}</div>
              <div className="clp-campo ancho"><small>Aduanas donde opera</small>{textoAduanas(p)}</div>
              <div className="clp-campo"><small>Correo</small><span className="truncate">{p.correo}</span></div>
              <div className="clp-campo"><small>Teléfono</small><span className="clp-mono">{p.telefono}</span></div>
            </div>
          </section>
        </div>
        <div className="clp-mm-col">
          <div className="clp-mm-stats">
            <div><b>{p.serviciosEsteAnio}</b><small>Servicios este año</small></div>
            <div><b>{p.operacionesActivas}</b><small>En operaciones abiertas</small></div>
          </div>
          <section>
            <div className="clp-mm-t">Servicios y tarifas</div>
            {p.servicios.length ? (
              <ul className="clp-mm-ops">
                {p.servicios.map((s) => <li key={s.pasoId}><span>{s.nombre}</span><span className="clp-mono fuerte">{s.tarifa != null ? formatoMoneda(s.tarifa) : "Sin tarifa"}</span></li>)}
              </ul>
            ) : <p className="clp-mm-vacio">Sin servicios: no aparece al asignar proveedor.</p>}
          </section>
        </div>
      </>
    ),
    acciones: (cerrar) => botonesDetalle(p, () => cerrar({ inmediato: true })),
  });

  const constanciaMorph = (p: ProveedorVista): DatosMorph => ({
    clase: "clp-morph-doc",
    ancho: 760,
    icono: <span className="clp-av clp-mm-doc-ico"><FileText aria-hidden /></span>,
    eyebrow: `Constancia de situación fiscal · ${p.razonSocial}`,
    titulo: `CSF_${p.rfc}.pdf`,
    cuerpo: <div className="clp-mm-doc clp-mm-doc-pdf"><iframe src={p.pdfConstanciaUrl ?? undefined} title={`Constancia de situación fiscal de ${p.razonSocial}`} /></div>,
    acciones: (cerrar) => (
      <>
        <a className="clp-btn clp-btn-secondary" href={p.pdfConstanciaUrl ?? undefined} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Abrir PDF</a>
        <button type="button" className="clp-btn clp-btn-primary" onClick={() => cerrar()}>Cerrar</button>
      </>
    ),
  });

  const abrirDetalle = (el: HTMLElement, p: ProveedorVista) => setMorph({ origen: el, proveedor: p });

  const tarjetas = (filas: ProveedorVista[]) => (
    <div className="clp-mgrid">
      {filas.map((p, i) => {
        const desde = tarifaDesde(p);
        return (
          <article
            key={p.id}
            data-proveedor={p.id}
            className={`clp-mcard clp-mp-card ${activo(p) ? "" : "apagada"} ${resaltar === p.id ? "nueva" : ""}`}
            style={{ "--i": i } as React.CSSProperties}
            tabIndex={0}
            role="button"
            aria-haspopup="dialog"
            aria-label={`${p.razonSocial}, ${ETIQUETA_TIPO_PROVEEDOR[p.tipoProveedor]}`}
            onClick={(e) => abrirDetalle(e.currentTarget, p)}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); abrirDetalle(e.currentTarget, p); } }}
          >
            <div className="clp-mc-top">
              <Avatar texto={p.razonSocial} />
              <span className="clp-mc-der">
                {activo(p) ? null : <Pill tono="neutro">Inactivo</Pill>}
                <Categoria tipo={p.tipoProveedor} />
                <Kebab acciones={acciones(p)} etiqueta={`Acciones de ${p.razonSocial}`} />
              </span>
            </div>
            <div className="clp-mc-cuerpo">
              <h4 className="clp-mc-nom">{p.razonSocial}</h4>
              <div className="clp-mc-rfc clp-mono">{p.rfc}</div>
            </div>
            <div className="clp-mp-servicios">
              {p.servicios.length ? (
                <>
                  {p.servicios.slice(0, 2).map((s) => <span key={s.pasoId}>{s.nombre}</span>)}
                  {p.servicios.length > 2 ? <span className="mas">+{p.servicios.length - 2}</span> : null}
                </>
              ) : <span className="vacio">Sin servicios registrados</span>}
            </div>
            <div className="clp-mc-pie">
              <div><small>Aduanas</small><b>{p.aduanas.length ? <>{p.aduanas[0]}{p.aduanas.length > 1 ? <span className="clp-mp-mas">+{p.aduanas.length - 1}</span> : null}</> : "Todas"}</b></div>
              <div className="der"><small>Tarifa desde</small><b className="clp-mono">{desde != null ? formatoMoneda(desde) : "—"}</b></div>
            </div>
          </article>
        );
      })}
    </div>
  );

  const columnas = useMemo<Columna<ProveedorVista>[]>(() => [
    { id: "razon", encabezado: "Razón social", celda: (p) => <span className="inline-block max-w-[280px] truncate align-middle font-semibold">{p.razonSocial}</span>, orden: (p) => p.razonSocial, csv: (p) => p.razonSocial },
    { id: "tipo", encabezado: "Tipo", celda: (p) => <Categoria tipo={p.tipoProveedor} />, orden: (p) => p.tipoProveedor, csv: (p) => ETIQUETA_TIPO_PROVEEDOR[p.tipoProveedor] },
    { id: "servicios", encabezado: "Servicios", celda: (p) => <span className="inline-block max-w-[230px] truncate align-middle text-slate-500">{p.servicios.map((s) => s.nombre).join(" · ") || "Sin servicios"}</span>, csv: (p) => p.servicios.map((s) => s.nombre).join(" · ") },
    { id: "aduanas", encabezado: "Aduanas", celda: (p) => <span className="text-slate-500">{textoAduanas(p)}</span>, csv: textoAduanas },
    { id: "fecha", encabezado: "Alta", celda: (p) => formatoFecha(p.fechaAlta), orden: (p) => p.fechaAlta, csv: (p) => formatoFecha(p.fechaAlta), alinear: "der" },
  ], []);

  // Exportar incluye todos los datos del proveedor, no solo las columnas visibles.
  const columnasCsv: Columna<ProveedorVista>[] = [
    ...columnas,
    { id: "rfc", encabezado: "RFC", celda: () => null, csv: (p) => p.rfc },
    { id: "persona", encabezado: "Persona", celda: () => null, csv: (p) => persona(p.rfc) },
    { id: "correo", encabezado: "Correo", celda: () => null, csv: (p) => p.correo },
    { id: "telefono", encabezado: "Teléfono", celda: () => null, csv: (p) => p.telefono },
    { id: "direccion", encabezado: "Dirección", celda: () => null, csv: (p) => p.direccion },
    { id: "tarifas", encabezado: "Tarifas", celda: () => null, csv: (p) => p.servicios.map((s) => `${s.nombre}: ${s.tarifa != null ? s.tarifa.toFixed(2) : "sin tarifa"}`).join(" · ") },
    { id: "estado", encabezado: "Estado", celda: () => null, csv: (p) => (activo(p) ? "Activo" : "Inactivo") },
    { id: "abiertas", encabezado: "En operaciones abiertas", celda: () => null, csv: (p) => p.operacionesActivas },
    { id: "anio", encabezado: "Servicios este año", celda: () => null, csv: (p) => p.serviciosEsteAnio },
  ];

  const filtros = useMemo<FiltroRapido<ProveedorVista>[]>(() => [
    { id: "LOGISTICA", etiqueta: "Logística", cumple: (p) => p.tipoProveedor === "LOGISTICA" },
    { id: "ADUANAL", etiqueta: "Aduanal", cumple: (p) => p.tipoProveedor === "ADUANAL" },
    { id: "GENERALES", etiqueta: "Generales", cumple: (p) => p.tipoProveedor === "GENERALES" },
    { id: "inactivos", etiqueta: "Inactivos", cumple: (p) => !activo(p) },
  ], []);

  const expandir = (p: ProveedorVista) => (
    <>
      <Bloque titulo="Datos fiscales">
        <Dato etiqueta="RFC" mono>{p.rfc}</Dato>
        <Dato etiqueta="Dirección">{p.direccion}</Dato>
        <Dato etiqueta="Contacto">{p.correo} · {p.telefono}</Dato>
        <Dato etiqueta="Alta">{formatoFecha(p.fechaAlta)}</Dato>
      </Bloque>
      <Bloque titulo="Servicios y tarifas">
        {p.servicios.length ? (
          <ul className="clp-dt-lista">
            {p.servicios.map((s) => <li key={s.pasoId}><span>{s.nombre}</span><b className="clp-mono">{s.tarifa != null ? formatoMoneda(s.tarifa) : "Sin tarifa"}</b></li>)}
          </ul>
        ) : <div className="clp-dt-vacio">Sin servicios: no aparece al asignar proveedor.</div>}
      </Bloque>
      <Bloque titulo="Cobertura y estado">
        <Dato etiqueta="Aduanas">{textoAduanas(p)}</Dato>
        <Dato etiqueta="Estado"><PillEstado p={p} /></Dato>
        <div className="clp-dt-acc">{botonesDetalle(p, undefined, true)}</div>
      </Bloque>
    </>
  );

  if (modo.tipo === "registro") {
    return <RegistroProveedor key={`${modo.editando?.id ?? "nuevo"}-${modo.n}`} editando={modo.editando} pasos={pasos} aduanas={aduanas} onVolver={volver} />;
  }

  return (
    <div className={`clp-cli ${modo.tipo === "saliendo" ? "clp-rc-saliendo" : ""} ${volviendo ? "clp-rc-volviendo" : ""}`}>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">Proveedores</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => descargarCsv("proveedores", columnasCsv, proveedores)}>
            <Download className="h-4 w-4" /> Exportar
          </button>
          {puedeEditar ? (
            <button type="button" className="clp-btn clp-btn-primary" onClick={() => abrirRegistro(null)}>
              <Plus className="h-4 w-4" /> Registrar proveedor
            </button>
          ) : null}
        </div>
      </div>

      <DataTable
        className="clp-cli-tabla"
        filas={proveedores}
        columnas={columnas}
        idFila={(p) => p.id}
        textoBusqueda={(p) => `${p.razonSocial} ${p.rfc} ${p.direccion} ${ETIQUETA_TIPO_PROVEEDOR[p.tipoProveedor]} ${p.servicios.map((s) => s.nombre).join(" ")}`}
        placeholderBusqueda="Razón social, RFC, dirección o servicio"
        nombreRegistros="proveedores"
        filtros={filtros}
        ordenInicial={{ columna: "fecha", dir: "desc" }}
        vistaAlterna={{ etiqueta: "Tarjetas", icono: <LayoutGrid aria-hidden />, porPagina: 8, render: tarjetas }}
        flotante
        expandir={expandir}
        vacio={proveedores.length === 0 ? "No hay proveedores registrados. Usa “Registrar proveedor” para agregar uno." : undefined}
      />

      {morph ? (
        <MorphModal
          key={`${morph.proveedor.id}-${morph.doc ? "doc" : "det"}`}
          origen={morph.origen}
          datos={morph.doc ? constanciaMorph(morph.proveedor) : detalleMorph(morph.proveedor)}
          alCerrar={() => setMorph(null)}
        />
      ) : null}
    </div>
  );
}
