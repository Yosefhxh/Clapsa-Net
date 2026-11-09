"use client";

import Link from "next/link";
import { UserSessionBadge } from "@/features/session";
import { BrandMark } from "./BrandMark";

interface HeaderProps {
  className?: string;
}

export function Header({ className = "" }: HeaderProps) {
  return (
    <header
      className={`clp-header sticky top-0 z-40 flex h-[4.5rem] w-full shrink-0 items-center justify-between px-4 sm:h-20 sm:px-6 md:px-[50px] ${className}`}
    >
      {/* Zona izquierda: Contenedor estilizado del logotipo institucional (CLAPSA | LMT del Pacífico) */}
      <div className="flex items-center">
        <Link
          href="/"
          className="group inline-flex items-center rounded-lg transition-opacity hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-white/40 py-1"
          aria-label="Ir a inicio de CLAPSA"
        >
          <BrandMark size="header" />
        </Link>
      </div>

      {/* Zona central: Espacio limpio (se excluyen enlaces de navegación y botón de cotización) */}
      <div className="flex-1" />

      {/* Zona derecha: Elementos funcionales de autenticación y gestión de sesión */}
      <div className="flex items-center gap-3">
        <UserSessionBadge />
      </div>
    </header>
  );
}

