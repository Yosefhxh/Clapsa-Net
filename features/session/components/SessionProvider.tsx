"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { usuarioPuede, type Permiso } from "@/shared/auth/permisos";
import type { UsuarioSesion } from "@/shared/auth/session-types";

/** Conteos para los puntos de aviso del menú lateral. */
export interface AvisosMenu { encargosPorVencer: number; operacionesUrgentes: number }

interface SessionContextValue {
  user: UsuarioSesion | null;
  /** Para mostrar u ocultar botones. La autorización real la hace el servidor. */
  puede: (permiso: Permiso) => boolean;
  avisos: AvisosMenu | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/** Recibe el usuario que el servidor validó con la cookie de sesión. */
export function SessionProvider({ usuario, avisos = null, children }: { usuario: UsuarioSesion | null; avisos?: AvisosMenu | null; children: ReactNode }) {
  const puede = (permiso: Permiso) => (usuario ? usuarioPuede(usuario, permiso) : false);

  return <SessionContext.Provider value={{ user: usuario, puede, avisos }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession debe usarse dentro de SessionProvider");
  return context;
}
