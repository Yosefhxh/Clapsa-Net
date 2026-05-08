"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { DEFAULT_WIDGETS, WidgetDef } from "./widgetsConfig";

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose?.()} />
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Configurar Widgets</h3>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded-md bg-gray-100"
              onClick={() => {
                const defaults = DEFAULT_WIDGETS.slice(0, 6);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
                setActive(defaults);
                setAvailable(DEFAULT_WIDGETS.slice(6));
                window.dispatchEvent(new CustomEvent("home_widgets_updated"));
              }}
            >
              Reset
            </button>
            <button className="px-3 py-1 rounded-md bg-aduanaBlue text-white" onClick={() => onClose?.()}>
              Cerrar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-2">Widgets activos</h4>
            <div className="space-y-3">
              {active.map((w, i) => {
                const Icon = ICON_MAP[w.icon] || Package;
                return (
                  <div key={w.id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-3 p-3 border-b bg-gray-50/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-full ${w.color || "bg-blue-50"}`}>
                          <Icon className="w-5 h-5 text-gray-800" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">{w.title}</div>
                          <div className="truncate text-xs text-gray-500">{w.id}</div>
                        </div>
                      </div>

                      {editingId === w.id ? (
                        <button
                          className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          onClick={() => setEditingId(null)}
                        >
                          Cerrar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            onClick={() => setEditingId(w.id)}
                          >
                            Editar
                          </button>
                          <button
                            className="rounded-md border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                            onClick={() => removeActive(i)}
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === w.id ? (
                      <div className="p-4">
                        <div className="mb-4 flex items-center gap-3 rounded-xl border bg-gray-50/80 p-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${w.color || "bg-blue-50"}`}>
                            <Icon className="h-6 w-6 text-gray-800" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">{w.title}</div>
                            <div className="text-xs text-gray-500">Icono actual: {w.icon}</div>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Colores</div>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {COLOR_OPTIONS.map((c) => {
                                const selected = w.color === c;
                                return (
                                  <button
                                    key={c}
                                    onClick={() => updateWidget(w.id, { color: c })}
                                    className={`flex h-11 items-center justify-center rounded-xl border ${c} ${
                                      selected ? "ring-2 ring-aduanaBlue ring-offset-2" : "hover:border-gray-400"
                                    }`}
                                    aria-label={c}
                                    title={c}
                                  >
                                    <span className="sr-only">{c}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Iconos</div>
                            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                              {Object.keys(ICON_MAP).map((k) => {
                                const Ik = ICON_MAP[k] || Package;
                                const selected = w.icon === k;
                                return (
                                  <button
                                    key={k}
                                    onClick={() => updateWidget(w.id, { icon: k })}
                                    className={`flex h-12 items-center justify-center rounded-xl border bg-white ${
                                      selected ? "border-aduanaBlue ring-2 ring-aduanaBlue ring-offset-2" : "hover:border-gray-400"
                                    }`}
                                    title={k}
                                  >
                                    <Ik className="h-5 w-5 text-gray-800" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Widgets disponibles</h4>
            <div className="space-y-2">
              {available.map((w, i) => {
                const Icon = ICON_MAP[w.icon] || Package;
                return (
                  <div key={w.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${w.color || "bg-blue-50"}`}>
                        <Icon className="w-5 h-5 text-aduanaBlue" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{w.title}</div>
                        <div className="text-xs text-gray-500">{w.id}</div>
                      </div>
                    </div>
                    <button className="text-xs px-2 py-1 bg-emerald-50 rounded" onClick={() => addAvailable(i)}>
                      Agregar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
