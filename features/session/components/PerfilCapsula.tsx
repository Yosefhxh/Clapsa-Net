"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { CalendarClock, LogOut, X } from "lucide-react";
import { cerrarSesionAction } from "@/features/usuarios";
import { useSession } from "./SessionProvider";
import { useAhora } from "@/shared/hooks/useAhora";
import { ETIQUETA_ROL, inicialesDe, textoIngreso } from "../utils/perfil";

const sinSuscripcion = () => () => undefined;

/** Botón de salir con su estado de carga ("Cerrando sesión…"). */
function BotonSalir() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="clp-perfil-salir" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <span className="clp-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
      <span>{pending ? "Cerrando sesión…" : "Cerrar sesión"}</span>
    </button>
  );
}

/**
 * Iniciales del usuario en la barra azul. Al picarlas, la cápsula se revela hacia la
 * izquierda dentro de la misma barra (no baja sobre el contenido) con nombre, rol,
 * fecha y hora de ingreso y la opción para salir.
 */
export function PerfilCapsula() {
  const { user } = useSession();
  const [abierta, setAbierta] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const salir = useRef<HTMLDivElement>(null);
  // La fecha depende de la zona horaria del navegador: en el servidor no se pinta.
  const enNavegador = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const ahora = useAhora();
  const ingreso = user && enNavegador ? textoIngreso(new Date(user.inicioSesion), new Date(ahora)) : "";

  // La cápsula no cambia el acomodo de la barra: se anima un recorte al ancho real del contenido.
  useLayoutEffect(() => {
    if (raiz.current && info.current) raiz.current.style.setProperty("--full", `${info.current.scrollWidth}px`);
  }, [ingreso, user]);

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierta(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setAbierta(false); boton.current?.focus(); } };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    const t = setTimeout(() => salir.current?.querySelector("button")?.focus({ preventScroll: true }), 220);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", tecla); clearTimeout(t); };
  }, [abierta]);

  if (!user) return null;

  return (
    <div ref={raiz} className={`clp-perfil ${abierta ? "clp-perfil-on" : ""}`}>
      <div ref={info} className="clp-perfil-info" role="group" aria-label={`Cuenta de ${user.nombre}`} inert={!abierta}>
        <span className="clp-perfil-nom"><b>{user.nombre}</b><small>{ETIQUETA_ROL[user.tipoUsuario]}</small></span>
        <i className="clp-perfil-sep" aria-hidden="true" />
        <span className="clp-perfil-ing"><CalendarClock aria-hidden="true" /><span>{ingreso}</span></span>
        <i className="clp-perfil-sep" aria-hidden="true" />
        <div ref={salir}>
          <form action={cerrarSesionAction}><BotonSalir /></form>
        </div>
        <button type="button" className="clp-perfil-x" aria-label="Cerrar información de la cuenta" onClick={() => { setAbierta(false); boton.current?.focus(); }}>
          <X aria-hidden="true" />
        </button>
      </div>
      <button
        ref={boton}
        type="button"
        className="clp-perfil-btn"
        aria-expanded={abierta}
        aria-label={`Cuenta de ${user.nombre}`}
        title={user.nombre}
        onClick={() => setAbierta((a) => !a)}
      >
        {inicialesDe(user.nombre)}
      </button>
    </div>
  );
}
