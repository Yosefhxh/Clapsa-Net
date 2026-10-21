"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface SessionUser {
  id: number;
  nombre: string;
  correo: string;
  tipoUsuario: string;
  estado: string;
  fechaRegistro: string;
  fechaIngreso: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  isReady: boolean;
  setSessionUser: (user: SessionUser | null) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = "clapsa-session-user";
export const LOGIN_DATE_STORAGE_KEY = "clapsa-login-date";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser) as SessionUser);
      }
    } catch (error) {
      console.error('Error al cargar la sesión:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(LOGIN_DATE_STORAGE_KEY);
    } finally {
      setIsReady(true);
    }
  }, []);

  const setSessionUser = (nextUser: SessionUser | null) => {
    setUser(nextUser);

    if (nextUser) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser));
      localStorage.setItem(LOGIN_DATE_STORAGE_KEY, nextUser.fechaIngreso);
      return;
    }

    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(LOGIN_DATE_STORAGE_KEY);
  };

  const clearSession = () => {
    setSessionUser(null);
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        isReady,
        setSessionUser,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession debe usarse dentro de SessionProvider");
  }

  return context;
}