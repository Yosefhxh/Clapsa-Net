"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Truck,
  Inbox,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  DollarSign,
  ArrowRightCircle,
  LucideIcon,
  X
} from "lucide-react";
import { DEFAULT_WIDGETS, WidgetDef } from "../config/widgetsConfig";

const ICON_MAP: Record<string, LucideIcon> = {
  Package,
  Truck,
  Inbox,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  DollarSign,
  ArrowRightCircle,
};

const STORAGE_KEY = "home_widgets_config";

const COLOR_OPTIONS = [
  "bg-red-50",
  "bg-amber-50",
  "bg-yellow-50",
  "bg-lime-50",
  "bg-emerald-50",
  "bg-sky-50",
  "bg-indigo-50",
  "bg-fuchsia-50",
  "bg-cyan-50",
];

export function WidgetsManager({ onClose }: { onClose?: () => void }) {
  const [active, setActive] = useState<WidgetDef[]>([]);
  const [available, setAvailable] = useState<WidgetDef[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActive(parsed);
          const ids = new Set(parsed.map((p: WidgetDef) => p.id));
          setAvailable(DEFAULT_WIDGETS.filter((d) => !ids.has(d.id)));
          return;
        }
      }
    } catch (e) {}

    setActive(DEFAULT_WIDGETS.slice(0, 6));
    setAvailable(DEFAULT_WIDGETS.slice(6));
  }, []);

  const save = (newActive: WidgetDef[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newActive));
    window.dispatchEvent(new CustomEvent("home_widgets_updated"));
  };

  const removeActive = (idx: number) => {
    const copy = [...active];
    const [item] = copy.splice(idx, 1);
    setActive(copy);
    setAvailable((s) => [item, ...s]);
    save(copy);
  };

  const addAvailable = (idx: number) => {
    const copyA = [...available];
    const [item] = copyA.splice(idx, 1);
    const newActive = [...active, item];
    setAvailable(copyA);
    setActive(newActive);
    save(newActive);
  };

  const updateWidget = (id: string, patch: Partial<WidgetDef>) => {
    const copy = active.map((w) => (w.id === id ? { ...w, ...patch } : w));
    setActive(copy);
    save(copy);
  };

  const handleReset = () => {
    const defaults = DEFAULT_WIDGETS.slice(0, 6);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    setActive(defaults);
    setAvailable(DEFAULT_WIDGETS.slice(6));
    window.dispatchEvent(new CustomEvent("home_widgets_updated"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/45 transition-opacity" 
        onClick={() => onClose?.()} 
      />
      
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="clp-modal-head pb-3">
          <h2 className="clp-modal-title">Configurar Widgets</h2>
          <button 
            onClick={() => onClose?.()}
            className="clp-icon-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 pt-3 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="clp-section-title mb-3">Widgets activos</h4>
              <div className="space-y-3">
                {active.map((w, i) => {
                  const Icon = ICON_MAP[w.icon] || Package;
                  return (
                    <div key={w.id} className="clp-fila overflow-hidden">
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`clp-stat-icono ${w.color || "bg-blue-50"}`}>
                            <Icon className="w-5 h-5 text-aduanaBlue" />
                          </div>
                          <div className="min-w-0 flex items-center h-full">
                            <div className="truncate text-sm font-semibold text-gray-900">{w.title}</div>
                          </div>
                        </div>

                        {editingId === w.id ? (
                          <button
                            className="clp-btn clp-btn-secondary clp-btn-sm shrink-0"
                            onClick={() => setEditingId(null)}
                          >
                            Ocultar
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              className="clp-btn clp-btn-secondary clp-btn-sm"
                              onClick={() => setEditingId(w.id)}
                            >
                              Editar
                            </button>
                            <button
                              className="clp-btn clp-btn-danger clp-btn-sm"
                              onClick={() => removeActive(i)}
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>

                      {editingId === w.id && (
                        <div className="border-t border-linea p-4">
                          <div className="grid gap-5 lg:grid-cols-2">
                            <div>
                              <div className="clp-label">Color del icono</div>
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {COLOR_OPTIONS.map((c) => {
                                  const selected = w.color === c;
                                  return (
                                    <button
                                      key={c}
                                      onClick={() => updateWidget(w.id, { color: c })}
                                      className={`flex h-10 items-center justify-center rounded-lg border ${c} transition-all ${
                                        selected ? "ring-2 ring-aduanaBlue border-transparent" : "border-slate-200 hover:border-slate-400"
                                      }`}
                                      title={c}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <div className="clp-label">Icono</div>
                              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                                {Object.keys(ICON_MAP).map((k) => {
                                  const Ik = ICON_MAP[k] || Package;
                                  const selected = w.icon === k;
                                  return (
                                    <button
                                      key={k}
                                      onClick={() => updateWidget(w.id, { icon: k })}
                                      className={`flex h-10 items-center justify-center rounded-lg border bg-white transition-all ${
                                        selected ? "border-aduanaBlue ring-1 ring-aduanaBlue text-aduanaBlue" : "border-slate-200 hover:border-slate-400 text-slate-500"
                                      }`}
                                      title={k}
                                    >
                                      <Ik className="h-4 w-4" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="clp-section-title mb-3">Widgets disponibles</h4>
              <div className="space-y-3">
                {available.length === 0 ? (
                  <div className="clp-fila border-dashed py-6 text-center text-sm text-slate-400">
                    Todos los widgets están activos.
                  </div>
                ) : (
                  available.map((w, i) => {
                    const Icon = ICON_MAP[w.icon] || Package;
                    return (
                      <div key={w.id} className="clp-fila flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-3">
                          <div className={`clp-stat-icono ${w.color || "bg-blue-50"}`}>
                            <Icon className="w-5 h-5 text-aduanaBlue" />
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{w.title}</div>
                        </div>
                        {/* Botón "+ Agregar" modificado a color verde claro */}
                        <button 
                          className="clp-btn clp-btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100" 
                          onClick={() => addAvailable(i)}
                        >
                          Agregar
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-linea">
          <button 
            className="clp-btn clp-btn-secondary"
            onClick={handleReset}
          >
            Restablecer valores
          </button>
          
          <button 
            className="clp-btn clp-btn-primary"
            onClick={() => onClose?.()}
          >
            Guardar y Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}