"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Download, LayoutGrid, Lock, Pencil, Plus, Power, UserX } from "lucide-react";
import { useSession } from "@/features/session";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useConfirmar } from "@/shared/components/ui/Confirmar";
import { DataTable, descargarCsv, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { Kebab, type AccionKebab } from "@/shared/components/ui/Kebab";
import { MorphModal, type DatosMorph } from "@/shared/components/ui/MorphModal";
import { Pill } from "@/shared/components/ui/Pill";
import { useAccion } from "@/shared/hooks/useAccion";
import { esHoy, formatoAcceso, formatoFecha } from "@/shared/utils/formato";
import { cambiarEstadoUsuario } from "../actions/usuarios";
import { permisosDeRol, ROLES, type MatrizPermisos, type UsuarioFila } from "../roles";
import { RegistroUsuario } from "./RegistroUsuario";

export type { UsuarioFila };

const activo = (u: UsuarioFila) => u.estado === "ACTIVO";
const PillEstado = ({ u }: { u: UsuarioFila }) => <Pill tono={activo(u) ? "ok" : "neutro"}>{activo(u) ? "Activo" : "Inactivo"}</Pill>;
const PillRol = ({ u }: { u: UsuarioFila }) => <Pill tono={ROLES[u.tipoUsuario].tono}>{ROLES[u.tipoUsuario].nombre}</Pill>;

const Dato = ({ etiqueta, children }: { etiqueta: string; children: ReactNode }) => (
  <div className="clp-dt-d"><small>{etiqueta}</small><span>{children}</span></div>
);
const Bloque = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div className="clp-dt-b"><div className="clp-dt-t">{titulo}</div>{children}</div>
);

type Modo =
  | { tipo: "lista" }
  | { tipo: "saliendo"; editando: UsuarioFila | null; password: boolean }
  | { tipo: "registro"; editando: UsuarioFila | null; password: boolean; n: number };

export function UsuariosVista({ usuarios, ahora, matriz }: { usuarios: UsuarioFila[]; ahora: string; matriz: MatrizPermisos }) {
  const { user } = useSession();
  const yo = user?.id ?? null;
  const confirmar = useConfirmar();
  const { ejecutar } = useAccion();
  const [modo, setModo] = useState<Modo>({ tipo: "lista" });
  const [volviendo, setVolviendo] = useState(false);
  const [resaltar, setResaltar] = useState<number | null>(null);
  const [morph, setMorph] = useState<{ origen: HTMLElement; usuario: UsuarioFila } | null>(null);
  const acceso = (u: UsuarioFila) => formatoAcceso(u.ultimoAcceso, ahora);

  useEffect(() => {
    if (resaltar == null) return;
    const t = setTimeout(() => setResaltar(null), 2200);
    return () => clearTimeout(t);
  }, [resaltar]);

  const abrirRegistro = useCallback((editando: UsuarioFila | null, password = false) => {
    setMorph(null);
    setModo({ tipo: "saliendo", editando, password });
    setTimeout(() => setModo({ tipo: "registro", editando, password, n: 0 }), 300);
  }, []);
  const volver = (guardado?: { id: number; otro: boolean }) => {
    if (guardado?.otro) { setModo((m) => ({ tipo: "registro", editando: null, password: false, n: (m.tipo === "registro" ? m.n : 0) + 1 })); return; }
    setModo({ tipo: "lista" });
    setVolviendo(true);
    setTimeout(() => setVolviendo(false), 700);
    if (guardado) setResaltar(guardado.id);
  };

  const alternarEstado = async (u: UsuarioFila) => {
    const baja = activo(u);
    const ok = await confirmar({
      titulo: `¿${baja ? "Desactivar" : "Reactivar"} a ${u.nombre}?`,
      texto: baja ? "No podrá iniciar sesión y se cerrarán sus sesiones activas. Su historial se conserva." : "Volverá a poder iniciar sesión.",
      ok: baja ? "Desactivar" : "Reactivar",
      peligro: baja,
    });
    if (!ok) return;
    ejecutar(async () => {
      const r = await cambiarEstadoUsuario(u.id, !baja);
      return r.success
        ? { ok: true as const, data: undefined, mensaje: baja ? `${u.nombre} quedó inactivo.` : `${u.nombre} se reactivó.` }
        : { ok: false as const, error: r.error ?? "No se pudo cambiar el estado." };
    }, (bien) => bien && setResaltar(u.id));
  };

  const acciones = (u: UsuarioFila): AccionKebab[] => [
    { icono: <Pencil aria-hidden />, texto: "Editar", alElegir: () => abrirRegistro(u) },
    { icono: <Lock aria-hidden />, texto: "Restablecer contraseña", alElegir: () => abrirRegistro(u, true) },
    ...(u.id !== yo ? [{ icono: activo(u) ? <UserX aria-hidden /> : <Power aria-hidden />, texto: activo(u) ? "Desactivar" : "Reactivar", peligro: activo(u), alElegir: () => alternarEstado(u) }] : []),
  ];

  const botonesDetalle = (u: UsuarioFila, antes?: () => void, pequenos?: boolean) => (
    <>
      <button type="button" className={`clp-btn clp-btn-secondary ${pequenos ? "clp-btn-sm" : ""}`} onClick={() => { antes?.(); abrirRegistro(u, true); }}><Lock className="h-4 w-4" />Restablecer contraseña</button>
      <button type="button" className={`clp-btn clp-btn-primary ${pequenos ? "clp-btn-sm" : ""}`} onClick={() => { antes?.(); abrirRegistro(u); }}><Pencil className="h-4 w-4" />Editar</button>
    </>
  );

  const detalleMorph = (u: UsuarioFila): DatosMorph => ({
    icono: <Avatar texto={u.nombre} className="clp-av-redondo" />,
    eyebrow: `Usuario · ${ROLES[u.tipoUsuario].nombre}${u.id === yo ? " · Tú" : ""}`,
    titulo: u.nombre,
    pills: <PillEstado u={u} />,
    cuerpo: (
      <>
        <div className="clp-mm-col">
          <section>
            <div className="clp-mm-t">Cuenta</div>
            <div className="clp-mm-grid">
              <div className="clp-campo ancho"><small>Correo</small><span className="break-all">{u.correo}</span></div>
              <div className="clp-campo"><small>Rol</small><span><PillRol u={u} /></span></div>
              <div className="clp-campo"><small>Último acceso</small>{acceso(u)}</div>
              <div className="clp-campo"><small>Alta</small>{formatoFecha(u.fechaRegistro)}</div>
            </div>
          </section>
        </div>
        <div className="clp-mm-col">
          <section>
            <div className="clp-mm-t">Qué puede hacer</div>
            <ul className="clp-mm-ops">
              {permisosDeRol(u.tipoUsuario, matriz).map((t) => <li key={t}><span>{t}</span><Pill tono="ok">Permitido</Pill></li>)}
            </ul>
          </section>
        </div>
      </>
    ),
    acciones: (cerrar) => botonesDetalle(u, () => cerrar({ inmediato: true })),
  });

  const abrirDetalle = (el: HTMLElement, u: UsuarioFila) => setMorph({ origen: el, usuario: u });

  const tarjetas = (filas: UsuarioFila[]) => (
    <div className="clp-mgrid">
      {filas.map((u, i) => (
        <article
          key={u.id}
          className={`clp-mcard clp-mu-card ${activo(u) ? "" : "apagada"} ${resaltar === u.id ? "nueva" : ""}`}
          style={{ "--i": i } as React.CSSProperties}
          tabIndex={0}
          role="button"
          aria-haspopup="dialog"
          aria-label={`${u.nombre}, ${ROLES[u.tipoUsuario].nombre}`}
          onClick={(e) => abrirDetalle(e.currentTarget, u)}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); abrirDetalle(e.currentTarget, u); } }}
        >
          <div className="clp-mu-top"><Kebab acciones={acciones(u)} etiqueta={`Acciones de ${u.nombre}`} /></div>
          <div className="clp-mu-av">
            <Avatar texto={u.nombre} className="clp-av-redondo" />
            {activo(u) && esHoy(u.ultimoAcceso, ahora) ? <i className="clp-en-linea" title="Activo hoy" /> : null}
          </div>
          <h4 className="clp-mc-nom">{u.nombre}{u.id === yo ? <span className="clp-mu-tu">Tú</span> : null}</h4>
          <div className="clp-mu-correo">{u.correo}</div>
          <div className="clp-mu-badges"><PillRol u={u} /><PillEstado u={u} /></div>
          <div className="clp-mu-pie"><b>{acceso(u)}</b><small>Último acceso</small></div>
        </article>
      ))}
    </div>
  );

  const columnas = useMemo<Columna<UsuarioFila>[]>(() => [
    { id: "nombre", encabezado: "Nombre", celda: (u) => <span className="font-semibold">{u.nombre}{u.id === yo ? <span className="ml-2 text-xs font-normal text-slate-500">(tú)</span> : null}</span>, orden: (u) => u.nombre, csv: (u) => u.nombre },
    { id: "rol", encabezado: "Rol", celda: (u) => <PillRol u={u} />, orden: (u) => u.tipoUsuario, csv: (u) => ROLES[u.tipoUsuario].nombre },
    { id: "estado", encabezado: "Estado", celda: (u) => <PillEstado u={u} />, orden: (u) => u.estado, csv: (u) => (activo(u) ? "Activo" : "Inactivo") },
    { id: "acceso", encabezado: "Último acceso", celda: (u) => <span className="tabular-nums">{formatoAcceso(u.ultimoAcceso, ahora)}</span>, orden: (u) => u.ultimoAcceso ?? "", csv: (u) => formatoAcceso(u.ultimoAcceso, ahora), alinear: "der" },
  ], [yo, ahora]);

  const columnasCsv: Columna<UsuarioFila>[] = [
    ...columnas,
    { id: "correo", encabezado: "Correo", celda: () => null, csv: (u) => u.correo },
    { id: "alta", encabezado: "Alta", celda: () => null, csv: (u) => formatoFecha(u.fechaRegistro) },
  ];

  const filtros = useMemo<FiltroRapido<UsuarioFila>[]>(() => [
    ...(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => ({ id: r, etiqueta: ROLES[r].corto, cumple: (u: UsuarioFila) => u.tipoUsuario === r })),
    { id: "inactivos", etiqueta: "Inactivos", cumple: (u) => !activo(u) },
  ], []);

  const expandir = (u: UsuarioFila) => (
    <>
      <Bloque titulo="Cuenta">
        <Dato etiqueta="Correo">{u.correo}</Dato>
        <Dato etiqueta="Último acceso">{acceso(u)}</Dato>
        <Dato etiqueta="Alta">{formatoFecha(u.fechaRegistro)}</Dato>
      </Bloque>
      <Bloque titulo="Rol y permisos">
        <div className="clp-dt-fase"><PillRol u={u} /></div>
        <ul className="clp-dt-lista check">{permisosDeRol(u.tipoUsuario, matriz).map((t) => <li key={t}><Check aria-hidden /><span>{t}</span></li>)}</ul>
      </Bloque>
      <Bloque titulo="Acciones">
        <Dato etiqueta="Estado"><PillEstado u={u} /></Dato>
        <div className="clp-dt-acc">{botonesDetalle(u, undefined, true)}</div>
      </Bloque>
    </>
  );

  if (modo.tipo === "registro") {
    return <RegistroUsuario key={`${modo.editando?.id ?? "nuevo"}-${modo.n}`} matriz={matriz} editando={modo.editando} yo={yo} enfocarPassword={modo.password} onVolver={volver} />;
  }

  return (
    <div className={`clp-cli ${modo.tipo === "saliendo" ? "clp-rc-saliendo" : ""} ${volviendo ? "clp-rc-volviendo" : ""}`}>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="clp-page-title">Gestión de Usuarios</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => descargarCsv("usuarios", columnasCsv, usuarios)}>
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button type="button" className="clp-btn clp-btn-primary" onClick={() => abrirRegistro(null)}>
            <Plus className="h-4 w-4" /> Nuevo usuario
          </button>
        </div>
      </div>

      <DataTable
        className="clp-cli-tabla"
        filas={usuarios}
        columnas={columnas}
        idFila={(u) => u.id}
        textoBusqueda={(u) => `${u.nombre} ${u.correo}`}
        placeholderBusqueda="Nombre o correo"
        nombreRegistros="usuarios"
        filtros={filtros}
        ordenInicial={{ columna: "nombre", dir: "asc" }}
        vistaAlterna={{ etiqueta: "Tarjetas", icono: <LayoutGrid aria-hidden />, porPagina: 8, render: tarjetas }}
        flotante
        expandir={expandir}
      />

      {morph ? <MorphModal key={morph.usuario.id} origen={morph.origen} datos={detalleMorph(morph.usuario)} alCerrar={() => setMorph(null)} /> : null}
    </div>
  );
}
