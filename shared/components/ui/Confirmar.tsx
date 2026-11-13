"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, TriangleAlert } from "lucide-react";

export interface OpcionesConfirmar {
  titulo: string;
  texto: string;
  ok: string;
  peligro?: boolean;
}

type Pedir = (o: OpcionesConfirmar) => Promise<boolean>;
const ContextoConfirmar = createContext<Pedir>(async () => false);

/** Confirmación con el estilo del sistema (en lugar del confirm del navegador). */
export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [pendiente, setPendiente] = useState<(OpcionesConfirmar & { resolver: (v: boolean) => void }) | null>(null);
  const [visible, setVisible] = useState(false);
  const si = useRef<HTMLButtonElement>(null);

  const actual = useRef<((v: boolean) => void) | null>(null);

  const pedir = useCallback<Pedir>((o) => new Promise((resolver) => {
    actual.current = resolver;
    setPendiente({ ...o, resolver });
  }), []);

  const terminar = useCallback((valor: boolean) => {
    const resolver = actual.current;
    actual.current = null;
    setVisible(false);
    resolver?.(valor);
    setTimeout(() => setPendiente(null), 200);
  }, []);

  useEffect(() => {
    if (!pendiente) return;
    const raf = requestAnimationFrame(() => { setVisible(true); si.current?.focus(); });
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); terminar(false); } };
    document.addEventListener("keydown", tecla, true);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", tecla, true); };
  }, [pendiente, terminar]);

  return (
    <ContextoConfirmar.Provider value={pedir}>
      {children}
      {pendiente
        ? createPortal(
            <div className={`clp-cf-fondo ${visible ? "on" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) terminar(false); }}>
              <div className="clp-cf" role="alertdialog" aria-modal="true" aria-labelledby="clp-cf-t" aria-describedby="clp-cf-d">
                <div className={`clp-cf-ico ${pendiente.peligro ? "peligro" : ""}`}>{pendiente.peligro ? <TriangleAlert aria-hidden /> : <Check aria-hidden />}</div>
                <h3 id="clp-cf-t">{pendiente.titulo}</h3>
                <p id="clp-cf-d">{pendiente.texto}</p>
                <div className="clp-cf-acc">
                  <button type="button" className="clp-btn clp-btn-secondary" onClick={() => terminar(false)}>Cancelar</button>
                  <button ref={si} type="button" className={`clp-btn ${pendiente.peligro ? "clp-btn-danger" : "clp-btn-primary"}`} onClick={() => terminar(true)}>{pendiente.ok}</button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </ContextoConfirmar.Provider>
  );
}

export const useConfirmar = () => useContext(ContextoConfirmar);
