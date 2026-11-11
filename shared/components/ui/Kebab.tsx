"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";

export interface AccionKebab {
  icono: ReactNode;
  texto: string;
  peligro?: boolean;
  alElegir: () => void;
}

/** Menú de 3 puntos. No deja pasar el clic a la tarjeta o fila que lo contiene. */
export function Kebab({ acciones, etiqueta = "Acciones" }: { acciones: AccionKebab[]; etiqueta?: string }) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setAbierto(false); raiz.current?.querySelector("button")?.focus(); } };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla, true);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", tecla, true); };
  }, [abierto]);

  if (!acciones.length) return null;

  return (
    <span ref={raiz} className="clp-kebab-raiz" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" className="clp-kebab" aria-label={etiqueta} aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        <MoreVertical aria-hidden />
      </button>
      {abierto ? (
        <div className="clp-menu-pop" role="menu">
          {acciones.map((a) => (
            <button key={a.texto} type="button" role="menuitem" className={a.peligro ? "clp-menu-peligro" : ""} onClick={() => { setAbierto(false); a.alElegir(); }}>
              {a.icono}
              {a.texto}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
