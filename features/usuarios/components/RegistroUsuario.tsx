"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Eye, EyeOff, Lock, Pencil, Shield, UserRound } from "lucide-react";
import type { TipoUsuario } from "@prisma/client";
import { Avatar } from "@/shared/components/ui/Avatar";
import { useToast } from "@/shared/components/ui/Toast";
import { PieRegistro, RegistroDividido, type EstadoBarra } from "@/shared/components/registro/RegistroDividido";
import { gestionarUsuario } from "../actions/usuarios";
import { generarPassword, permisosDeRol, REGLAS_PASSWORD, ROLES, type MatrizPermisos, type UsuarioFila } from "../roles";

interface Props {
  matriz: MatrizPermisos;
  editando: UsuarioFila | null;
  /** Id del usuario con sesión: no puede desactivarse a sí mismo. */
  yo: number | null;
  /** Abre con el cursor en la contraseña (Restablecer contraseña). */
  enfocarPassword?: boolean;
  onVolver: (guardado?: { id: number; otro: boolean }) => void;
}

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ICONO_ROL: Record<TipoUsuario, typeof Shield> = { ADMIN: Shield, EDITOR: Pencil, VIEWER: Eye };

function formInicial(u: UsuarioFila | null) {
  return { nombre: u?.nombre ?? "", correo: u?.correo ?? "", tipoUsuario: u?.tipoUsuario ?? ("EDITOR" as TipoUsuario), activo: u ? u.estado === "ACTIVO" : true };
}
type Form = ReturnType<typeof formInicial>;

/** Registrar o editar usuario en vista dividida: rol a la izquierda, cuenta y contraseña a la derecha. */
export function RegistroUsuario({ matriz, editando, yo, enfocarPassword, onVolver }: Props) {
  const avisar = useToast();
  const [guardando, iniciar] = useTransition();
  const [form, setForm] = useState(() => formInicial(editando));
  const [inicial] = useState(() => JSON.stringify(formInicial(editando)));
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [generada, setGenerada] = useState(0);
  const [otro, setOtro] = useState(false);
  const [error, setError] = useState("");
  const [resalta, setResalta] = useState(false);
  const campoPass = useRef<HTMLInputElement>(null);
  const soyYo = editando != null && editando.id === yo;

  // Restablecer contraseña: abre el registro con el foco en la contraseña y resalta su tarjeta.
  useEffect(() => {
    if (!enfocarPassword) return;
    const t = setTimeout(() => { campoPass.current?.focus({ preventScroll: false }); setResalta(true); }, 450);
    const fin = setTimeout(() => setResalta(false), 2050);
    return () => { clearTimeout(t); clearTimeout(fin); };
  }, [enfocarPassword]);

  const cumple = REGLAS_PASSWORD.map(([, f]) => f(password));
  const nivel = password ? cumple.filter(Boolean).length : 0;
  const passOk = cumple.every(Boolean);
  const pideP = !editando || password !== "";
  const cambios = !editando || JSON.stringify(form) !== inicial || password !== "";
  const falta = !form.nombre.trim() ? ["Escribe el nombre completo.", "rc-nombre"]
    : !CORREO.test(form.correo.trim()) ? ["Escribe un correo válido.", "rc-ucorreo"]
    : pideP && !passOk ? ["La contraseña debe tener mínimo 10 caracteres, con mayúscula, minúscula y número.", "rc-pass"]
    : null;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };

  const estadoBarra: EstadoBarra = guardando
    ? { texto: editando ? "Guardando cambios…" : "Guardando usuario…", tono: "info", cargando: true }
    : editando && !cambios ? { texto: "Sin cambios", tono: "neutro" }
    : !falta ? (editando ? { texto: "Cambios sin guardar", tono: "alerta" } : { texto: "Listo para guardar", tono: "ok" })
    : password && !passOk ? { texto: "Revisa la contraseña", tono: "alerta" }
    : form.nombre || form.correo || password ? { texto: "Faltan datos", tono: "neutro" }
    : { texto: "Sin capturar", tono: "neutro" };

  const generar = () => { setPassword(generarPassword()); setVer(true); setGenerada((n) => n + 1); setError(""); };

  const guardar = () => {
    if (guardando) return;
    if (falta) { setError(falta[0]); document.getElementById(falta[1])?.focus(); return; }
    setError("");
    iniciar(async () => {
      const r = await gestionarUsuario(
        { nombre: form.nombre, correo: form.correo, tipoUsuario: form.tipoUsuario, estado: form.activo ? "activo" : "inactivo", password },
        editando?.id,
      );
      if (!r.success || !("id" in r) || r.id == null) return setError(r.error ?? "No se pudo guardar.");
      const nombre = form.nombre.trim();
      avisar(editando ? (password ? `Cambios guardados. ${nombre} deberá iniciar sesión con su nueva contraseña.` : `Cambios guardados en ${nombre}.`) : `Usuario ${nombre} registrado.`);
      onVolver({ id: r.id, otro: !editando && otro });
    });
  };

  return (
    <RegistroDividido
      avatar={form.nombre.trim() ? <Avatar key={form.nombre.trim().slice(0, 12)} texto={form.nombre} className="clp-rcf-entra clp-av-redondo" /> : <span className="clp-av clp-rcf-vacio clp-av-redondo"><UserRound aria-hidden /></span>}
      datos={[
        { etiqueta: "Nombre", valor: form.nombre.trim(), vacio: "Por capturar", ancho: true },
        { etiqueta: "Correo", valor: form.correo.trim().toLowerCase(), ancho: true },
        { etiqueta: "Rol", valor: ROLES[form.tipoUsuario].nombre },
        { etiqueta: "Estado", valor: form.activo ? "Activo" : "Inactivo" },
      ]}
      estado={estadoBarra}
      editando={editando != null}
      guardando={guardando}
      etiquetaVolver="Volver a Usuarios"
      onVolver={() => onVolver()}
      error={error}
      izquierda={() => (
        <div className="clp-ru-panel">
          <div className="clp-ru-h"><h3>Rol y acceso <em>*</em></h3><small>Define lo que podrá hacer en el sistema</small></div>
          <div className="clp-ru-roles" role="radiogroup" aria-label="Rol">
            {(Object.keys(ROLES) as TipoUsuario[]).map((r) => {
              const Icono = ICONO_ROL[r];
              return (
                <button key={r} type="button" className="clp-ru-rol" role="radio" aria-checked={form.tipoUsuario === r} onClick={() => set("tipoUsuario", r)}>
                  <span className="clp-ru-ico"><Icono aria-hidden /></span>
                  <span><b>{ROLES[r].nombre}</b><small>{ROLES[r].descripcion}</small></span>
                  <i className="clp-ru-radio" />
                </button>
              );
            })}
          </div>
          <div className="clp-ru-puede">
            <div className="clp-ru-pt">Podrá hacer</div>
            <ul key={form.tipoUsuario}>{permisosDeRol(form.tipoUsuario, matriz).map((t) => <li key={t}><Check aria-hidden />{t}</li>)}</ul>
          </div>
        </div>
      )}
    >
      <div className="clp-rc-card clp-ru-cuenta">
        <div className="clp-rc-card-h"><h3>Datos de la cuenta</h3></div>
        <div className="clp-rc-grid">
          <div className="clp-rf ancho">
            <label htmlFor="rc-nombre">Nombre completo <em>*</em></label>
            <div className="clp-rf-in"><input id="rc-nombre" className="clp-rc-input" maxLength={120} placeholder="Nombre y apellidos" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} /></div>
          </div>
          <div className="clp-rf ancho">
            <label htmlFor="rc-ucorreo">Correo <em>*</em></label>
            <div className="clp-rf-in"><input id="rc-ucorreo" type="email" autoComplete="off" className="clp-rc-input" placeholder="nombre@clapsa.com" value={form.correo} onChange={(e) => set("correo", e.target.value)} /></div>
          </div>
          <div className="clp-rf ancho">
            <label>Estado</label>
            <div className="clp-rc-seg clp-ru-est" role="group" aria-label="Estado">
              {[true, false].map((a) => (
                <button key={String(a)} type="button" aria-pressed={form.activo === a} disabled={soyYo && !a} title={soyYo && !a ? "No puedes desactivar tu propio usuario" : undefined} onClick={() => set("activo", a)}>{a ? "Activo" : "Inactivo"}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`clp-rc-card clp-ru-pass-card ${resalta ? "clp-rc-resalta" : ""}`}>
        <div className="clp-rc-card-h">
          <h3>Contraseña</h3>
          <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" onClick={generar}><Lock className="h-4 w-4" />Generar segura</button>
        </div>
        <div className="clp-rf">
          <label htmlFor="rc-pass">{editando ? <>Nueva contraseña <span className="clp-rf-opc">Opcional</span></> : <>Contraseña <em>*</em></>}</label>
          <div key={generada} className={`clp-rf-in clp-ru-pass ${generada ? "lleno" : ""}`}>
            <input ref={campoPass} id="rc-pass" type={ver ? "text" : "password"} className="clp-rc-input clp-mono" autoComplete="new-password" placeholder={editando ? "Déjala vacía para no cambiarla" : "Escribe o genera una contraseña"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
            <button type="button" className="clp-ru-ver" aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVer((v) => !v)}>{ver ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</button>
          </div>
        </div>
        <div className="clp-ru-fuerza" data-n={nivel} aria-hidden="true"><i /><i /><i /><i /></div>
        <ul className="clp-ru-reglas" aria-label="Requisitos de la contraseña">
          {REGLAS_PASSWORD.map(([t], i) => <li key={t} className={cumple[i] ? "ok" : ""}><i>{cumple[i] ? "✓" : ""}</i>{t}</li>)}
        </ul>
        <PieRegistro>
          {editando ? (
            <span className="clp-rc-edit-nota"><Pencil aria-hidden />Estás editando un registro existente</span>
          ) : (
            <label className="clp-rc-crear-op"><input type="checkbox" checked={otro} onChange={(e) => setOtro(e.target.checked)} disabled={guardando} /> Registrar otro usuario al guardar</label>
          )}
          <button type="button" className="clp-btn clp-btn-secondary" onClick={() => onVolver()} disabled={guardando}>Cancelar</button>
          <button type="button" className="clp-btn clp-btn-primary" onClick={guardar} disabled={guardando || !cambios} aria-busy={guardando || undefined}>
            {guardando ? <span className="clp-rd-spin clp-rd-spin-blanco" aria-hidden /> : <Check className="h-4 w-4" />}
            {guardando ? (editando ? "Guardando cambios…" : "Guardando…") : editando ? "Guardar cambios" : "Guardar usuario"}
          </button>
        </PieRegistro>
      </div>
    </RegistroDividido>
  );
}
