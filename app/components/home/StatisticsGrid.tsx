"use client";

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
} from "lucide-react";
import { useEffect, useState } from "react";
import { StatWidget } from "./StatWidget";
import { DEFAULT_WIDGETS } from "./widgetsConfig";

const ICON_MAP: Record<string, any> = {
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

export function StatisticsGrid() {
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS.slice(0, 6));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgets(parsed);
        }
      }
    } catch (e) {
      // ignore
    }

    const onUpdate = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setWidgets(JSON.parse(raw));
      } catch (e) {}
    };

    window.addEventListener("home_widgets_updated", onUpdate as EventListener);
    return () => window.removeEventListener("home_widgets_updated", onUpdate as EventListener);
  }, []);

  const save = (newWidgets: typeof widgets) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
    window.dispatchEvent(new CustomEvent("home_widgets_updated"));
  };

  const onDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const onDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (isNaN(from)) return;
    const copy = [...widgets];
    const [item] = copy.splice(from, 1);
    copy.splice(toIdx, 0, item);
    setWidgets(copy);
    save(copy);
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((w, i) => {
        const Icon = ICON_MAP[w.icon] || Package;
        return (
          <div
            key={w.id}
            draggable
            onDragStart={(e) => onDragStart(e, i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, i)}
          >
            <StatWidget title={w.title} icon={Icon} color={w.color} />
          </div>
        );
      })}
    </div>
  );
}
