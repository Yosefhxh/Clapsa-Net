"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { TipoUsuario } from "@prisma/client";
import { useSession } from "@/features/session";
import { DataTable, type Columna, type FiltroRapido } from "@/shared/components/ui/DataTable";
import { Drawer } from "@/shared/components/ui/Drawer";
import { Pill } from "@/shared/components/ui/Pill";
import { useToast } from "@/shared/components/ui/Toast";
import { useAccion } from "@/shared/hooks/useAccion";
import { formatoFechaHora } from "@/shared/utils/formato";
import { eliminarUsuarioAction, gestionarUsuario } from "../actions/usuarios";

export interface UsuarioFila {
  id: number;
  nombre: string;
  correo: string;
  tipoUsuario: TipoUsuario;
  estado: "ACTIVO" | "INACTIVO";
  fechaRegistro: string;
  ultimoAcceso: string | null;
}

const ROLES: Record<TipoUsuario, { nombre: string; descripcion: string }> = {
  ADMIN: { nombre: "Administrador", descripcion: "Todo, incluido pedimento, cuenta de gastos, usuarios y configuración." },
  EDITOR: { nombre: "Editor", descripcion: "Opera: crea operaciones, avanza pasos, revisa documentos y edita catálogos." },
  VIEWER: { nombre: "Consulta", descripcion: "Solo puede ver la información." },
};

const vacio = { nombre: "", correo: "", tipoUsuario: "EDITOR" as TipoUsuario, estado: "activo" as "activo" | "inactivo", password: "" };

export function UsuariosVista({ usuarios }: { usuarios: UsuarioFila[] }) {
  const { user } = useSession();
  const avisar = useToast();
  const { ejecutar } = useAccion();
  const [guardando, iniciar] = useTransition();
  const [editando, setEditando] = useState<UsuarioFila | "nuevo" | null>(null);
  const [form, setForm] = useState(vacio);
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState<UsuarioFila | null>(null);

  const abrir = (u: UsuarioFila | "nuevo") => {
    setError("");
    setForm(u === "nuevo" ? vacio : { nombre: u.nombre, correo: u.correo, tipoUsuario: u.tipoUsuario, estado: u.estado === "ACTIVO" ? "activo" : "inactivo", password: "" });
    setEditando(u);
  };

  const guardar = () => {
    setError("");
    iniciar(async () => {
      const r = await gestionarUsuario(form, editando === "nuevo" ? undefined : editando!.id);
      if (!r.success) return setError(r.error ?? "No se pudo guardar.");
      avisar(editando === "nuevo" ? "Usuario creado." : "Usuario actualizado.");
      setEditando(null);
    });
  };

  const columnas = useMemo<Columna<UsuarioFila>[]>(() => [
    { id: "nombre", encabezado: "Nombre", celda: (u) => <span className="font-semibold">{u.nombre}{u.id === user?.id ? <span className="ml-2 text-xs font-normal text-slate-500">(tú)</span> : null}</span>, orden: (u) => u.nombre, csv: (u) => u.nombre },
    { id: "correo", encabezado: "Correo", celda: (u) => u.correo, orden: (u) => u.correo, csv: (u) => u.correo },
    { id: "rol", encabezado: "Rol", celda: (u) => <span className="clp-chip">{ROLES[u.tipoUsuario].nombre}</span>, orden: (u) => u.tipoUsuario, csv: (u) => ROLES[u.tipoUsuario].nombre },
    { id: "acceso", encabezado: "Último acceso", celda: (u) => <span className="tabular-nums">{formatoFechaHora(u.ultimoAcceso)}</span>, orden: (u) => u.ultimoAcceso, csv: (u) => formatoFechaHora(u.ultimoAcceso), alinear: "der" },
    { id: "estado", encabezado: "Estado", celda: (u) => <Pill tono={u.estado === "ACTIVO" ? "ok" : "neutro"}>{u.estado === "ACTIVO" ? "Activo" : "Inactivo"}</Pill>, orden: (u) => u.estado, csv: (u) => u.estado },
    {
      id: "acciones", encabezado: "Acciones", alinear: "der",
      celda: (u) => (
        <span className="inline-flex gap-1">
          <button type="button" className="clp-icon-btn" aria-label={`Editar ${u.nombre}`} onClick={() => abrir(u)}><Pencil className="h-4 w-4" /></button>
          {u.id !== user?.id ? <button type="button" className="clp-icon-btn clp-icon-btn-danger" aria-label={`Eliminar ${u.nombre}`} onClick={() => setEliminando(u)}><Trash2 className="h-4 w-4" /></button> : null}
        </span>
      ),
    },
  ], [user?.id]);

  const filtros = useMemo<FiltroRapido<UsuarioFila>[]>(() => [
    ...(Object.keys(ROLES) as TipoUsuario[]).map((r) => ({ id: r, etiqueta: ROLES[r].nombre, cumple: (u: UsuarioFila) => u.tipoUsuario === r })),
    { id: "inactivos", etiqueta: "Inactivos", cumple: (u) => u.estado === "INACTIVO" },
  ], []);

  return (
    <>
      <div className="clp-page-head flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="clp-page-title">Gestión de Usuarios</h1>
        </div>
        <button type="button" className="clp-btn clp-btn-primary" onClick={() => abrir("nuevo")}><Plus className="h-4 w-4" /> Nuevo usuario</button>
      </div>

      <DataTable
        filas={usuarios}
        columnas={columnas}
        idFila={(u) => u.id}
        textoBusqueda={(u) => `${u.nombre} ${u.correo}`}
        placeholderBusqueda="Nombre o correo"
        nombreRegistros="usuarios"
        filtros={filtros}
        ordenInicial={{ columna: "nombre", dir: "asc" }}
        exportarComo="usuarios"
      />

      <Drawer
        open={editando != null}
        onClose={() => setEditando(null)}
        title={editando === "nuevo" ? "Nuevo usuario" : `Editar ${editando?.nombre ?? ""}`}
        subtitle="Define el rol y el acceso. Al desactivar o cambiar la contraseña se cierran sus sesiones."
        footer={
          <>
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-primary" disabled={guardando} onClick={guardar}>{guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar</button>
          </>
        }
      >
        {error ? <div className="clp-alert mb-4 text-sm font-medium text-red-700" role="alert">{error}</div> : null}
        <div className="grid gap-3">
          <div>
            <label className="clp-label" htmlFor="us-nombre">Nombre completo <span className="text-red-600">*</span></label>
            <input id="us-nombre" className="clp-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={120} />
          </div>
          <div>
            <label className="clp-label" htmlFor="us-correo">Correo <span className="text-red-600">*</span></label>
            <input id="us-correo" type="email" className="clp-input" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          </div>
          <div>
            <label className="clp-label" htmlFor="us-pass">{editando === "nuevo" ? "Contraseña" : "Nueva contraseña"} {editando === "nuevo" ? <span className="text-red-600">*</span> : null}</label>
            <input id="us-pass" type="password" autoComplete="new-password" className="clp-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editando === "nuevo" ? "" : "Déjala vacía para no cambiarla"} />
            <p className="clp-ayuda">Mínimo 10 caracteres, con mayúscula, minúscula y número.</p>
          </div>
          <fieldset>
            <legend className="clp-label">Rol <span className="text-red-600">*</span></legend>
            <div className="space-y-2">
              {(Object.keys(ROLES) as TipoUsuario[]).map((r) => (
                <label key={r} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${form.tipoUsuario === r ? "border-aduanaBlue bg-tinte" : "border-linea"}`}>
                  <input type="radio" name="rol" className="mt-0.5 accent-aduanaBlue" checked={form.tipoUsuario === r} onChange={() => setForm({ ...form, tipoUsuario: r })} />
                  <span><span className="block text-sm font-semibold">{ROLES[r].nombre}</span><span className="text-xs text-slate-500">{ROLES[r].descripcion}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="clp-label" htmlFor="us-estado">Estado</label>
            <select id="us-estado" className="clp-input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as "activo" | "inactivo" })}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={eliminando != null}
        onClose={() => setEliminando(null)}
        title="Eliminar usuario"
        subtitle={eliminando?.correo}
        footer={
          <>
            <button type="button" className="clp-btn clp-btn-secondary" onClick={() => setEliminando(null)}>Cancelar</button>
            <button type="button" className="clp-btn clp-btn-danger" onClick={() => ejecutar(async () => {
              const r = await eliminarUsuarioAction(eliminando!.id);
              return r.success ? { ok: true as const, data: undefined, mensaje: "Usuario eliminado." } : { ok: false as const, error: r.error ?? "No se pudo eliminar." };
            }, (ok) => ok && setEliminando(null))}>Eliminar definitivamente</button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Su historial en la bitácora se conserva sin nombre de usuario. Si solo quieres quitarle el acceso, mejor desactívalo.</p>
      </Drawer>
    </>
  );
}
