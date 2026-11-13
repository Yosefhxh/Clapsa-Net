"use client";

import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export interface DatoBarra {
  etiqueta: string;
  valor: string;
  /** Texto gris cuando aún no hay valor. */
  vacio?: string;
  mono?: boolean;
  ancho?: boolean;
}

export interface EstadoBarra {
  texto: string;
  tono: "ok" | "alerta" | "info" | "neutro";
  cargando?: boolean;
}

interface Props {
  /** Avatar o ícono de la ficha en vivo. */
  avatar: ReactNode;
  datos: DatoBarra[];
  estado: EstadoBarra;
  editando?: boolean;
  guardando?: boolean;
  etiquetaVolver: string;
  onVolver: () => void;
  /** Columna izquierda; recibe si hay un archivo arrastrándose encima del registro. */
  izquierda: (encima: boolean) => ReactNode;
  /** Al soltar un archivo en cualquier parte del registro. */
  alSoltarArchivo?: (archivo: File) => void;
  error?: string;
  /** Tarjetas de la columna derecha; la última lleva el pie de acciones. */
  children: ReactNode;
}

/**
 * Registro en vista dividida (clientes, proveedores, usuarios): ficha en vivo arriba,
 * documento a la izquierda y formulario a la derecha, ocupando todo el marco.
 */
export function RegistroDividido({ avatar, datos, estado, editando, guardando, etiquetaVolver, onVolver, izquierda, alSoltarArchivo, error, children }: Props) {
  const [on, setOn] = useState(false);
  const [encima, setEncima] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Esc regresa a la lista (si no hay un modal abierto encima ni se está guardando).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !guardando && !document.querySelector(".clp-morph, .clp-cf-fondo")) onVolver(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [guardando, onVolver]);

  const arrastre = alSoltarArchivo
    ? {
        onDragOver: (e: DragEvent) => { e.preventDefault(); setEncima(true); },
        onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setEncima(false); },
        onDrop: (e: DragEvent) => { e.preventDefault(); setEncima(false); const f = e.dataTransfer.files[0]; if (f && !guardando) alSoltarArchivo(f); },
      }
    : {};

  return (
    <div className={`clp-rc ${on ? "on" : ""} ${guardando ? "clp-rc-guardando" : ""}`} {...arrastre}>
      <section className="clp-card clp-rc-barra">
        <button type="button" className="clp-rc-volver" onClick={onVolver} disabled={guardando} title={etiquetaVolver} aria-label={etiquetaVolver}><ChevronLeft aria-hidden /></button>
        <span className="clp-rcf-av">{avatar}</span>
        {datos.map((d) => (
          <div key={d.etiqueta} className={`clp-rcf-c ${d.ancho ? "clp-rcf-ancho" : ""}`}>
            <small>{d.etiqueta}</small>
            <b key={d.valor || "vacio"} className={`${d.mono ? "clp-mono" : ""} ${d.valor ? "clp-rcf-entra" : "clp-rcf-pend"}`}>{d.valor || d.vacio || "—"}</b>
          </div>
        ))}
        <span className="flex-1" />
        {editando ? <span className="clp-rcf-modo">Editando</span> : null}
        <span className={`clp-pill clp-pill-${estado.tono} clp-rcf-estado ${estado.cargando ? "clp-pill-sin-punto" : ""}`} role="status">
          {estado.cargando ? <span className="clp-rd-spin" aria-hidden /> : null}
          {estado.texto}
        </span>
      </section>
      <div className="clp-rc-split">
        <section className="clp-rc-izq" aria-label="Documento">{izquierda(encima)}</section>
        <section className="clp-rc-der">
          {error ? <div className="clp-rc-error" role="alert">{error}</div> : null}
          {children}
        </section>
      </div>
    </div>
  );
}

/** Pie de acciones de la última tarjeta del registro. */
export function PieRegistro({ children }: { children: ReactNode }) {
  return <div className="clp-rc-acciones">{children}</div>;
}
