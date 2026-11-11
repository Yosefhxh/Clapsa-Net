"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Un esqueleto que ya apareció se sostiene al menos este tiempo para que no parpadee. */
const MINIMO_MS = 400;
let visibleDesde: number | null = null;

/** Envuelve el esqueleto que se muestra mientras llegan los datos reales y anota cuándo apareció. */
export function MarcaEsqueleto({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    visibleDesde = performance.now();
  }, []);
  return <>{children}</>;
}

/**
 * Contenido que reemplaza a un esqueleto. Si el esqueleto estuvo visible menos de 400 ms,
 * lo sostiene lo que falte y luego muestra el contenido con una entrada suave.
 */
export function TrasEsqueleto({ esqueleto, children }: { esqueleto: ReactNode; children: ReactNode }) {
  const esq = useRef<HTMLDivElement>(null);
  const cont = useRef<HTMLDivElement>(null);
  // Se lee una sola vez por montaje (en desarrollo React corre los efectos dos veces).
  const desdeRef = useRef<number | null | undefined>(undefined);

  useLayoutEffect(() => {
    if (desdeRef.current === undefined) {
      desdeRef.current = visibleDesde;
      visibleDesde = null;
    }
    const desde = desdeRef.current;
    if (desde == null) return;
    const falta = MINIMO_MS - (performance.now() - desde);
    const mostrar = () => {
      esq.current?.classList.add("clp-esq-oculto");
      cont.current?.classList.remove("clp-esq-oculto");
      cont.current?.classList.add("clp-esq-entra");
    };
    if (falta <= 0) { cont.current?.classList.add("clp-esq-entra"); return; }
    esq.current?.classList.remove("clp-esq-oculto");
    cont.current?.classList.add("clp-esq-oculto");
    const t = setTimeout(mostrar, falta);
    return () => { clearTimeout(t); mostrar(); };
  }, []);

  return (
    <>
      <div ref={esq} className="clp-esq-oculto" aria-hidden="true">{esqueleto}</div>
      <div ref={cont}>{children}</div>
    </>
  );
}
