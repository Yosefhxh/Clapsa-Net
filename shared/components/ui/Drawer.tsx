"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  ancho?: "md" | "lg";
}

/** Panel lateral para registros y ajustes. Se cierra con Esc o al picar fuera. */
export function Drawer({ open, title, subtitle, onClose, children, footer, ancho = "md" }: DrawerProps) {
  const tituloId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    const enfocable = panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-cerrar])");
    enfocable?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      anterior?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="clp-drawer-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`clp-drawer ${ancho === "lg" ? "clp-drawer-lg" : ""}`}
      >
        <header className="clp-drawer-head">
          <div className="min-w-0">
            <h2 id={tituloId} className="clp-modal-title">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <button type="button" data-cerrar onClick={onClose} className="clp-icon-btn" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="clp-drawer-body">{children}</div>
        {footer ? <footer className="clp-drawer-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
