import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface MenuItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  /** Punto de aviso con su texto (por ejemplo, "2 urgentes"). */
  aviso?: { tono: "ambar" | "coral"; texto: string } | null;
}

export function MenuItem({ href, label, icon: Icon, isActive, aviso }: MenuItemProps) {
  const etiqueta = aviso ? `${label} · ${aviso.texto}` : label;
  return (
    <li className="shrink-0 md:w-11">
      <Link
        href={href}
        className={`clp-nav-item justify-start py-2.5 pl-3 pr-3 space-x-3 md:h-11 md:justify-center md:space-x-0 md:p-0 ${isActive ? "clp-nav-item-activa" : ""}`}
      >
        <span className="relative inline-flex">
          <Icon className="w-[18px] h-[18px] md:w-[25px] md:h-[25px]" />
          {aviso ? <i className={`clp-punto-aviso ${aviso.tono}`} aria-hidden="true" /> : null}
        </span>
        <span className="font-medium text-sm md:sr-only">{etiqueta}</span>
        <span aria-hidden="true" className="clp-nav-tip hidden md:block">
          {etiqueta}
        </span>
      </Link>
    </li>
  );
}
