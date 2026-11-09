"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Search, Settings2, X } from "lucide-react";
import { Drawer } from "@/shared/components/ui/Drawer";
import { useAccion } from "@/shared/hooks/useAccion";
import { guardarWidgetsAction } from "../actions";
import { MAX_WIDGETS, TONOS, WIDGET, WIDGETS, WIDGETS_INICIALES, type CategoriaWidget, type TonoWidget, type WidgetElegido } from "../widgets";
import { KpiWidget } from "./KpiWidget";

interface Props {
  open: boolean;
  onClose: () => void;
  actuales: WidgetElegido[];
  conteos: Record<string, number>;
}

const CATEGORIAS: CategoriaWidget[] = ["Operación", "Transporte y arribo", "Pagos y cobranza"];

/** Panel para elegir, ordenar y ajustar hasta 6 widgets. Solo cambia la vista del usuario. */
export function PersonalizarWidgets({ open, onClose, actuales, conteos }: Props) {
  const { pendiente, ejecutar } = useAccion();
  const [borrador, setBorrador] = useState<WidgetElegido[]>(actuales);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<CategoriaWidget | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const lleno = borrador.length >= MAX_WIDGETS;

  const disponibles = useMemo(() => {
    const usados = new Set(borrador.map((w) => w.widget));
    const q = busqueda.trim().toLowerCase();
    return WIDGETS.filter((w) => !usados.has(w.id) && (!categoria || w.categoria === categoria) && (!q || `${w.titulo} ${w.descripcion}`.toLowerCase().includes(q)));
  }, [borrador, categoria, busqueda]);

  const mover = (de: number, a: number) =>
    setBorrador((b) => {
      if (a < 0 || a >= b.length) return b;
      const n = [...b];
      const [x] = n.splice(de, 1);
      n.splice(a, 0, x);
      return n;
    });
  const actualizar = (i: number, cambios: Partial<WidgetElegido>) => setBorrador((b) => b.map((w, j) => (j === i ? { ...w, ...cambios } : w)));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ancho="lg"
      title="Personalizar widgets"
      subtitle={`Elige hasta ${MAX_WIDGETS} indicadores para tu Home. Solo cambia tu vista; los demás usuarios no se ven afectados.`}
      footer={
        <>
          <button type="button" className="clp-btn clp-btn-secondary mr-auto" onClick={() => { setBorrador(WIDGETS_INICIALES); setAbierto(null); }}>Restablecer</button>
          <button type="button" className="clp-btn clp-btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="clp-btn clp-btn-primary" disabled={pendiente} onClick={() => ejecutar(() => guardarWidgetsAction(borrador), (ok) => ok && onClose())}>Guardar cambios</button>
        </>
      }
    >
      <section className="rounded-xl bg-lienzo p-3">
        <div className="clp-grupo-titulo">Vista previa</div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
          {borrador.map((w) => <KpiWidget key={w.widget} definicion={WIDGET(w.widget)!} eleccion={w} valor={conteos[w.widget] ?? 0} compacto />)}
          {Array.from({ length: MAX_WIDGETS - borrador.length }, (_, i) => (
            <div key={i} className="grid min-h-[5rem] place-items-center rounded-[10px] border-[1.5px] border-dashed border-slate-300 text-xs text-slate-500">Espacio libre</div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="clp-section-title">En tu tablero</h3>
            <span className="clp-contador">{borrador.length} de {MAX_WIDGETS}</span>
          </div>
          <p className="mb-3 text-sm text-slate-600">Arrastra para ordenar o usa las flechas. En el engrane cambias el color o pones un límite de aviso.</p>
          <ol className="space-y-1.5">
            {borrador.map((w, i) => {
              const def = WIDGET(w.widget)!;
              const ajustes = abierto === w.widget;
              return (
                <li
                  key={w.widget}
                  draggable
                  onDragStart={() => setArrastrando(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (arrastrando != null) mover(arrastrando, i); setArrastrando(null); }}
                  onDragEnd={() => setArrastrando(null)}
                  className={`rounded-[10px] border bg-white ${ajustes ? "border-aduanaBlue" : "border-linea"} ${arrastrando === i ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2 p-2">
                    <GripVertical className="h-4 w-4 cursor-grab text-slate-400" aria-hidden />
                    <span className="h-7 w-1.5 rounded-full" style={{ background: TONOS[w.tono].color }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{def.titulo}</div>
                      <div className="truncate text-xs text-slate-500">{def.categoria}{w.umbral != null ? ` · avisa arriba de ${w.umbral}` : ""}</div>
                    </div>
                    <button type="button" className="clp-icon-btn" onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label={`Subir ${def.titulo}`}><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" className="clp-icon-btn" onClick={() => mover(i, i + 1)} disabled={i === borrador.length - 1} aria-label={`Bajar ${def.titulo}`}><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" className="clp-icon-btn" onClick={() => setAbierto(ajustes ? null : w.widget)} aria-expanded={ajustes} aria-label={`Ajustes de ${def.titulo}`}><Settings2 className="h-4 w-4" /></button>
                    <button type="button" className="clp-icon-btn clp-icon-btn-danger" onClick={() => setBorrador((b) => b.filter((_, j) => j !== i))} aria-label={`Quitar ${def.titulo}`}><X className="h-4 w-4" /></button>
                  </div>
                  {ajustes ? (
                    <div className="space-y-3 rounded-b-[10px] border-t border-linea bg-slate-50 p-3">
                      <div>
                        <div className="clp-label">Color según lo que indica</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(Object.keys(TONOS) as TonoWidget[]).map((t) => (
                            <button key={t} type="button" aria-pressed={w.tono === t} onClick={() => actualizar(i, { tono: t })}
                              className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs ${w.tono === t ? "font-semibold text-slate-900" : "text-slate-600"}`}
                              style={{ borderColor: w.tono === t ? TONOS[t].color : undefined, boxShadow: w.tono === t ? `0 0 0 1px ${TONOS[t].color}` : undefined }}>
                              <i className="h-3 w-3 rounded-full" style={{ background: TONOS[t].color }} />{TONOS[t].nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="clp-label" htmlFor={`umbral-${w.widget}`}>Resaltar cuando pase de</label>
                        <input id={`umbral-${w.widget}`} className="clp-input w-36 tabular-nums" inputMode="numeric" placeholder="Sin límite"
                          value={w.umbral ?? ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); actualizar(i, { umbral: v === "" ? null : Number(v) }); }} />
                        <p className="clp-ayuda">Hoy: {conteos[w.widget] ?? 0}. Si lo rebasa, el widget se marca con “Revisar”.</p>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
            {borrador.length === 0 ? <li className="rounded-[10px] border border-dashed border-linea p-5 text-center text-sm text-slate-500">Tu tablero está vacío. Agrega widgets desde Disponibles.</li> : null}
          </ol>
        </section>

        <section>
          <h3 className="clp-section-title mb-2">Disponibles</h3>
          <label className="clp-dt-buscar mb-2 !flex-none">
            <Search className="h-4 w-4" aria-hidden />
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar widget" aria-label="Buscar widget" />
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button type="button" className="clp-dt-chip" aria-pressed={categoria === null} onClick={() => setCategoria(null)}>Todas</button>
            {CATEGORIAS.map((c) => <button key={c} type="button" className="clp-dt-chip" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>)}
          </div>
          {lleno ? <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Ya tienes {MAX_WIDGETS}. Quita uno para agregar otro.</p> : null}
          <ul className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
            {disponibles.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-[10px] border border-linea p-2.5">
                <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ background: TONOS[d.tono].color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{d.titulo} <span className="font-normal text-slate-500">· {conteos[d.id] ?? 0}</span></div>
                  <div className="text-xs text-slate-500">{d.descripcion}</div>
                </div>
                <button type="button" className="clp-btn clp-btn-secondary clp-btn-sm" disabled={lleno} onClick={() => setBorrador((b) => [...b, { widget: d.id, tono: d.tono, umbral: null }])}>
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </li>
            ))}
            {disponibles.length === 0 ? <li className="text-sm text-slate-500">No hay widgets con ese filtro.</li> : null}
          </ul>
          <p className="clp-ayuda mt-3">Solo se ofrecen indicadores que el sistema puede calcular con sus datos.</p>
        </section>
      </div>
    </Drawer>
  );
}
