"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useAccion } from "@/shared/hooks/useAccion";
import { guardarOrdenHomeAction, restablecerOrdenHomeAction } from "../actions";
import { mover, ORDEN_INICIAL, type GrupoOrden, type OrdenHome } from "../orden";

const CURVA = "cubic-bezier(.22,1,.36,1)";
const claveDe = (el: HTMLElement) => `${el.dataset.grupo}:${el.dataset.id}`;
const itemsDe = (raiz: HTMLElement | null, grupo?: GrupoOrden) =>
  [...(raiz?.querySelectorAll<HTMLElement>(grupo ? `[data-grupo="${grupo}"]` : "[data-grupo]") ?? [])];

interface Arrastre {
  it: HTMLElement;
  grupo: GrupoOrden;
  clon: HTMLElement;
  x0: number;
  y0: number;
  l0: number;
  t0: number;
  ultimo: HTMLElement | null;
  pausa: number;
}

/**
 * "Personalizar orden" del Home: los widgets y las secciones se arrastran con el puntero
 * (el elemento flota con el cursor y los demás se recorren) o se mueven con las flechas.
 * Al terminar se guarda el acomodo del usuario.
 */
export function useOrdenHome(inicial: OrdenHome, nombre: (grupo: GrupoOrden, id: string) => string) {
  const [orden, setOrden] = useState(inicial);
  const [ordenando, setOrdenando] = useState(false);
  const [estado, setEstado] = useState("");
  const [hueco, setHueco] = useState<string | null>(null);
  const { ejecutar } = useAccion();

  const raiz = useRef<HTMLDivElement>(null);
  const ordenRef = useRef(inicial);
  const guardado = useRef(JSON.stringify(inicial));
  const antes = useRef<Map<string, DOMRect> | null>(null);
  const enfocar = useRef<string | null>(null);
  const arrastre = useRef<Arrastre | null>(null);

  useEffect(() => { ordenRef.current = orden; }, [orden]);


  /** Cambia el orden guardando las posiciones previas para animar el desplazamiento (FLIP). */
  const aplicar = useCallback((nuevo: OrdenHome) => {
    antes.current = new Map(itemsDe(raiz.current).map((el) => [claveDe(el), el.getBoundingClientRect()]));
    ordenRef.current = nuevo;
    setOrden(nuevo);
  }, []);

  const reordenar = useCallback((grupo: GrupoOrden, id: string, destino: number) => {
    const lista = ordenRef.current[grupo];
    const nueva = mover(lista, id, destino);
    if (nueva === lista) return false;
    aplicar({ ...ordenRef.current, [grupo]: nueva });
    return true;
  }, [aplicar]);

  const posicion = (grupo: GrupoOrden, id: string) =>
    `${nombre(grupo, id)}: posición ${ordenRef.current[grupo].indexOf(id) + 1} de ${ordenRef.current[grupo].length}.`;

  // Los elementos se deslizan a su nuevo lugar en lugar de saltar.
  useLayoutEffect(() => {
    const previas = antes.current;
    antes.current = null;
    if (previas) {
      itemsDe(raiz.current).forEach((el) => {
        const a = previas.get(claveDe(el));
        if (!a) return;
        const d = el.getBoundingClientRect();
        const dx = a.left - d.left, dy = a.top - d.top;
        if (!dx && !dy) return;
        el.style.transition = "none";
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          el.style.transition = `transform .28s ${CURVA}`;
          el.style.transform = "";
          setTimeout(() => { el.style.transition = ""; }, 300);
        });
      });
    }
    if (enfocar.current) {
      raiz.current?.querySelector<HTMLElement>(`[data-grupo="${enfocar.current.split(":")[0]}"][data-id="${enfocar.current.split(":")[1]}"]`)?.focus();
      enfocar.current = null;
    }
  }, [orden]);

  const guardar = useCallback(() => {
    const actual = JSON.stringify(ordenRef.current);
    if (actual === guardado.current) return;
    guardado.current = actual;
    const o = ordenRef.current;
    ejecutar(() => guardarOrdenHomeAction(o));
  }, [ejecutar]);

  const entrar = () => {
    setOrdenando(true);
    setEstado("Arrastra los widgets y secciones para acomodarlos.");
  };

  const salir = useCallback(() => {
    setOrdenando(false);
    setEstado("");
    guardar();
  }, [guardar]);

  const restablecer = () => {
    aplicar({ kpis: [...ORDEN_INICIAL.kpis], grid: [...ORDEN_INICIAL.grid], avisos: [...ORDEN_INICIAL.avisos] });
    setEstado("Orden original restablecido.");
    guardado.current = JSON.stringify(ORDEN_INICIAL);
    ejecutar(() => restablecerOrdenHomeAction());
  };

  // Esc termina el acomodo desde cualquier parte de la pantalla.
  useEffect(() => {
    if (!ordenando) return;
    const tecla = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); salir(); } };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  }, [ordenando, salir]);

  // Si se sale de la pantalla a medio acomodo, se guarda lo que haya.
  const salirRef = useRef(salir);
  const ordenandoRef = useRef(ordenando);
  useEffect(() => { salirRef.current = salir; ordenandoRef.current = ordenando; }, [salir, ordenando]);
  useEffect(() => () => { if (ordenandoRef.current) salirRef.current(); }, []);

  const alMover = useCallback((e: globalThis.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    a.clon.style.left = `${a.l0 + e.clientX - a.x0}px`;
    a.clon.style.top = `${a.t0 + e.clientY - a.y0}px`;
    // Tras un movimiento se espera a que termine el acomodo (evita que el elemento rebote).
    if (Date.now() < a.pausa) return;
    const otro = itemsDe(raiz.current, a.grupo).find((x) => {
      if (x === a.it) return false;
      const b = x.getBoundingClientRect();
      return e.clientX > b.left && e.clientX < b.right && e.clientY > b.top && e.clientY < b.bottom;
    }) ?? null;
    if (otro === a.ultimo) return;
    a.ultimo = otro;
    const id = a.it.dataset.id!;
    if (otro && reordenar(a.grupo, id, ordenRef.current[a.grupo].indexOf(otro.dataset.id!))) {
      a.pausa = Date.now() + 320;
      setEstado(posicion(a.grupo, id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reordenar]);

  const alSoltar = useCallback(() => {
    const a = arrastre.current;
    if (!a) return;
    arrastre.current = null;
    window.removeEventListener("pointermove", alMover);
    const r = a.it.getBoundingClientRect();
    a.clon.style.transition = `left .22s ${CURVA}, top .22s ${CURVA}, box-shadow .22s, transform .22s`;
    a.clon.style.left = `${r.left}px`;
    a.clon.style.top = `${r.top}px`;
    a.clon.classList.add("clp-ord-soltando");
    setTimeout(() => { a.clon.remove(); setHueco(null); }, 230);
  }, [alMover]);

  const alPresionar = (e: PointerEvent<HTMLDivElement>) => {
    if (!ordenando || e.button !== 0) return;
    const it = (e.target as HTMLElement).closest<HTMLElement>("[data-orden-item]");
    if (!it || !raiz.current?.contains(it)) return;
    e.preventDefault();
    const grupo = it.dataset.grupo as GrupoOrden;
    const r = it.getBoundingClientRect();
    const clon = it.cloneNode(true) as HTMLElement;
    clon.classList.add("clp-ord-clon");
    [clon, ...clon.querySelectorAll<HTMLElement>("[data-orden-item], [id]")].forEach((x) => { x.removeAttribute("data-orden-item"); x.removeAttribute("data-grupo"); x.removeAttribute("id"); });
    Object.assign(clon.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    document.body.append(clon);
    setHueco(claveDe(it));
    arrastre.current = { it, grupo, clon, x0: e.clientX, y0: e.clientY, l0: r.left, t0: r.top, ultimo: null, pausa: 0 };
    setEstado(posicion(grupo, it.dataset.id!));
    window.addEventListener("pointermove", alMover);
    window.addEventListener("pointerup", alSoltar, { once: true });
  };

  // Teclado: flechas para mover el elemento enfocado.
  const alTecla = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!ordenando) return;
    const it = e.target as HTMLElement;
    if (!it.hasAttribute("data-orden-item")) return;
    const d = ({ ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 } as Record<string, number>)[e.key];
    if (!d) return;
    e.preventDefault();
    const grupo = it.dataset.grupo as GrupoOrden, id = it.dataset.id!;
    if (reordenar(grupo, id, ordenRef.current[grupo].indexOf(id) + d)) {
      enfocar.current = `${grupo}:${id}`;
      setEstado(posicion(grupo, id));
    }
  };

  /** Atributos de cada elemento acomodable. */
  const item = (grupo: GrupoOrden, id: string) => ({
    "data-grupo": grupo,
    "data-id": id,
    ...(ordenando ? { "data-orden-item": "", tabIndex: 0, "aria-roledescription": "elemento reordenable", "aria-label": nombre(grupo, id) } : {}),
    ...(hueco === `${grupo}:${id}` ? { "data-hueco": "" } : {}),
  });

  return { orden, ordenando, estado, raiz, entrar, salir, restablecer, alPresionar, alTecla, item };
}
