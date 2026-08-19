"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, LogOut, User } from "lucide-react";
import { useSession } from "./SessionProvider";

export function UserSessionBadge() {
  const router = useRouter();
  const { user, isReady, clearSession } = useSession();

  if (!isReady) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-1.5 backdrop-blur-sm">
        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
        <div className="space-y-1">
          <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
          <div className="h-2 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="group flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-1.5 backdrop-blur-sm transition-colors hover:border-aduanaBlue/20 hover:bg-white"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors group-hover:bg-aduanaBlue/10 group-hover:text-aduanaBlue">
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
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-1.5 backdrop-blur-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 leading-tight text-right">
        <p className="truncate text-[15px] font-medium text-slate-800">{user.nombre}</p>
        <p className="truncate text-[11px] text-slate-500">{user.tipoUsuario}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          clearSession();
          router.replace("/login");
        }}
        className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/70 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}