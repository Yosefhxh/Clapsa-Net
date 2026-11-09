"use client";

import { useTransition } from "react";
import { useToast } from "@/shared/components/ui/Toast";
import type { Resultado } from "@/shared/lib/resultado";

/**
 * Ejecuta una acción del servidor mostrando su aviso. Devuelve true si salió bien.
 * La pantalla se actualiza sola porque las acciones revalidan su ruta.
 */
export function useAccion() {
  const [pendiente, iniciar] = useTransition();
  const avisar = useToast();

  const ejecutar = (accion: () => Promise<Resultado<unknown>>, alTerminar?: (ok: boolean) => void) =>
    iniciar(async () => {
      const r = await accion();
      if (r.ok) {
        if (r.mensaje) avisar(r.mensaje);
      } else {
        avisar(r.error, "error");
      }
      alTerminar?.(r.ok);
    });

  return { pendiente, ejecutar };
}
