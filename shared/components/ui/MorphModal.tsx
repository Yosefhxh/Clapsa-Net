"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type CerrarMorph = (opciones?: { inmediato?: boolean }) => void;

export interface DatosMorph {
  icono: ReactNode;
  eyebrow: ReactNode;
  titulo: string;
  pills?: ReactNode;
  cuerpo: ReactNode;
  acciones?: (cerrar: CerrarMorph) => ReactNode;
  ancho?: number;
  clase?: string;
}

interface Rect { left: number; top: number; width: number; height: number }
const rectDe = (el: HTMLElement): Rect => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
const ponerRect = (el: HTMLElement, r: Rect) => Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });

/**
 * Detalle que crece desde la tarjeta (o miniatura) hasta el centro y regresa a ella al cerrar.
 * Se monta cuando hay un origen; al terminar de cerrar llama a `alCerrar`.
 */
export function MorphModal({ origen, datos, alCerrar }: { origen: HTMLElement; datos: DatosMorph; alCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const cerrarBtn = useRef<HTMLButtonElement>(null);
  const cerrando = useRef(false);
  const alCerrarRef = useRef(alCerrar);
  useEffect(() => { alCerrarRef.current = alCerrar; }, [alCerrar]);

  useLayoutEffect(() => {
    const c = caja.current!, f = fondo.current!;
    const W = Math.min(datos.ancho ?? 820, window.innerWidth - 32);
    // Se mide la altura natural ya abierta para que el modal no deje huecos.
    c.classList.add("midiendo", "abierta");
    Object.assign(c.style, { left: "0px", top: "0px", width: `${W}px`, height: "auto" });
    const H = Math.min(Math.max(c.offsetHeight, 360), window.innerHeight - 48);
    c.classList.remove("abierta");
    ponerRect(c, rectDe(origen));
    void c.offsetWidth;
    c.classList.remove("midiendo");
    void c.offsetWidth;
    origen.classList.add("clp-origen");
    const raf = requestAnimationFrame(() => {
      f.classList.add("on");
      c.classList.add("abierta");
      ponerRect(c, { left: (window.innerWidth - W) / 2, top: (window.innerHeight - H) / 2, width: W, height: H });
    });
    const t = setTimeout(() => { if (!cerrando.current) { c.classList.add("revelada"); cerrarBtn.current?.focus({ preventScroll: true }); } }, 400);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); origen.classList.remove("clp-origen"); };
    // Solo al montar: el origen y el contenido no cambian mientras está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cerrar = useCallback<CerrarMorph>((o) => {
    if (cerrando.current) return;
    cerrando.current = true;
    const c = caja.current, f = fondo.current;
    if (o?.inmediato || !c || !f || !origen.isConnected) {
      origen.classList.remove("clp-origen");
      alCerrarRef.current();
      return;
    }
    c.classList.remove("revelada");
    setTimeout(() => {
      c.classList.remove("abierta");
      f.classList.remove("on");
      ponerRect(c, rectDe(origen));
      const fin = (e: TransitionEvent) => {
        if (e.propertyName !== "width") return;
        c.removeEventListener("transitionend", fin);
        origen.classList.remove("clp-origen");
        origen.focus({ preventScroll: true });
        alCerrarRef.current();
      };
      c.addEventListener("transitionend", fin);
    }, 140);
  }, [origen]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); } };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [cerrar]);

  return createPortal(
    <>
      <div ref={fondo} className="clp-morph-fondo" onClick={() => cerrar()} />
      <div ref={caja} className={`clp-morph ${datos.clase ?? ""}`} role="dialog" aria-modal="true" aria-label={datos.titulo}>
        <div className="clp-mm-head">
          {datos.icono}
          <div className="clp-mm-tit">
            <div className="clp-mm-eyebrow">{datos.eyebrow}</div>
            <h3>{datos.titulo}</h3>
          </div>
          {datos.pills ? <div className="clp-mm-pills">{datos.pills}</div> : null}
          <button ref={cerrarBtn} type="button" className="clp-mm-x" aria-label="Cerrar" onClick={() => cerrar()}><X aria-hidden /></button>
        </div>
        <div className="clp-mm-body">{datos.cuerpo}</div>
        {datos.acciones ? <div className="clp-mm-acc">{datos.acciones(cerrar)}</div> : null}
      </div>
    </>,
    document.body,
  );
}
