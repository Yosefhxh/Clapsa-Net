"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";
import { cerrarSesionAction } from "@/features/usuarios";
import { useSession } from "./SessionProvider";

export function UserSessionBadge() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="max-w-[6rem] truncate text-sm font-semibold text-white sm:max-w-[14rem]">{user.nombre}</p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-linea bg-white shadow-lg">
          <form action={cerrarSesionAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-tinte hover:text-red-600 focus-visible:outline-aduanaBlue"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}