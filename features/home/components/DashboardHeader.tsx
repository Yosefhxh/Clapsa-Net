"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { LoginDateTimeDisplay } from "./LoginDateTimeDisplay";
import { WidgetsManager } from "./WidgetsManager";

export function DashboardHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Tablero de Operaciones</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">
              Bienvenido a <span className="font-semibold text-aduanaBlue">Clapsa Net</span>
            </p>
            <span className="text-gray-300">|</span>
            <LoginDateTimeDisplay />
          </div>
        </div>

        <div className="pt-2">
          {/* Botón actualizado para coincidir exactamente con el diseño principal de botones (ej. "Registrar cliente") */}
          <button
            className="flex items-center gap-2 rounded-lg border border-aduanaBlue/20 bg-aduanaBlue/10 px-4 py-2 font-medium text-aduanaBlue transition-colors hover:border-aduanaBlue/30 hover:bg-aduanaBlue/15 lg:ml-auto"
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