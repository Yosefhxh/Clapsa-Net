"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { LoginDateTimeDisplay } from "./LoginDateTimeDisplay";
import { WidgetsManager } from "./WidgetsManager";

export function DashboardHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="clp-page-head flex items-start justify-between gap-4">
        <div>
          <h1 className="clp-page-title">Control de Tráficos</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <p className="clp-page-sub text-sm">
              Bienvenido a <span className="font-semibold text-aduanaBlue">Clapsa Net</span>
            </p>
            <span className="hidden text-slate-400 lg:inline">|</span>
            <LoginDateTimeDisplay />
          </div>
        </div>

        <div className="pt-2">
          {/* Botón actualizado para coincidir exactamente con el diseño principal de botones (ej. "Registrar cliente") */}
          <button
            className="clp-btn clp-btn-secondary lg:ml-auto"
            onClick={() => setOpen(true)}
          >
            <Settings className="w-4 h-4" />
            <span>Widgets</span>
          </button>
        </div>
      </div>

      {open ? <WidgetsManager onClose={() => setOpen(false)} /> : null}
    </div>
  );
}