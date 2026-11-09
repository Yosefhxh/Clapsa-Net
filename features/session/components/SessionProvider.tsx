"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { tienePermiso, type Permiso } from "@/shared/auth/permisos";
import type { UsuarioSesion } from "@/shared/auth/session-types";

interface SessionContextValue {
  user: UsuarioSesion | null;
  /** Para mostrar u ocultar botones. La autorización real la hace el servidor. */
  puede: (permiso: Permiso) => boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/** Recibe el usuario que el servidor validó con la cookie de sesión. */
export function SessionProvider({ usuario, children }: { usuario: UsuarioSesion | null; children: ReactNode }) {
  const puede = (permiso: Permiso) => (usuario ? tienePermiso(usuario.tipoUsuario, permiso) : false);

  return <SessionContext.Provider value={{ user: usuario, puede }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession debe usarse dentro de SessionProvider");
  return context;
}
