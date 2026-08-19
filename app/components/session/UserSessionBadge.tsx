"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, LogOut, User } from "lucide-react";
import { useSession } from "./SessionProvider";

export function UserSessionBadge() {
  const router = useRouter();
  const { user, isReady, clearSession } = useSession();
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

  if (!isReady) {
    return (
      <div className="flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 backdrop-blur-sm">
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="group flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 backdrop-blur-sm transition-colors hover:bg-white"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors group-hover:bg-aduanaBlue/10 group-hover:text-aduanaBlue">
          <LogIn className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium text-slate-800">Iniciar sesión</p>
          <p className="text-[11px] text-slate-500">Acceso al sistema</p>
        </div>
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 text-left backdrop-blur-sm transition-colors hover:bg-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-medium text-slate-700">{user.nombre}</p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => {
              clearSession();
              setOpen(false);
              router.replace("/login");
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}