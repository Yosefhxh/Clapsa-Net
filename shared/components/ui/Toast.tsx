"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

type TipoAviso = "ok" | "error";
interface Aviso { id: number; texto: string; tipo: TipoAviso }

const ToastContext = createContext<(texto: string, tipo?: TipoAviso) => void>(() => undefined);

/** Avisos breves de confirmación o error en la parte inferior de la pantalla. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguiente = useRef(0);

  const avisar = useCallback((texto: string, tipo: TipoAviso = "ok") => {
    const id = ++siguiente.current;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === "error" ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={avisar}>
      {children}
      <div className="clp-toasts" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`clp-toast ${a.tipo === "error" ? "clp-toast-error" : ""}`}>
            {a.tipo === "error" ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
