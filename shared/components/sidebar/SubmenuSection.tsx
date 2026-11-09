import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";
import { SubmenuItem } from "./SubmenuItem";
import Link from "next/link";

interface SubmenuLink {
  href: string;
  label: string;
}

interface SubmenuSectionProps {
  label: string;
  icon: LucideIcon;
  isOpen: boolean;
  onToggle: () => void;
  isActive: boolean;
  submenuItems: SubmenuLink[];
  defaultHref: string;
}

export function SubmenuSection({
  label,
  icon: Icon,
  isOpen,
  onToggle,
  isActive,
  submenuItems,
  defaultHref,
}: SubmenuSectionProps) {
  return (
    <li className="relative shrink-0 md:w-11">
      {/* Celular: fila con texto; el submenú se despliega debajo */}
      <div
        className={`clp-nav-item justify-between md:hidden ${isActive ? "clp-nav-item-activa" : ""}`}
      >
        <Link href={defaultHref} className="flex flex-1 items-center gap-3 py-2.5 pl-3 pr-2">
          <Icon className="w-[18px] h-[18px]" />
          <span className="font-medium text-sm">{label}</span>
        </Link>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? `Cerrar ${label}` : `Abrir ${label}`}
          className="mr-2 rounded-md p-1 opacity-60 transition hover:opacity-100"
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {isOpen && (
        <ul className="mt-1 ml-9 space-y-1 border-l border-white/25 pl-2 md:hidden">
          {submenuItems.map((item) => (
            <SubmenuItem key={item.href} href={item.href} label={item.label} />
          ))}
        </ul>
      )}

      {/* Escritorio: solo el icono; abre el menú completo */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls="menu-completo"
        data-menu-control
        className={`clp-nav-item hidden h-11 justify-center md:flex ${isActive ? "clp-nav-item-activa" : ""}`}
      >
        <Icon className="w-[25px] h-[25px]" />
        <span aria-hidden="true" className="clp-nav-tip">
          {label}
        </span>
      </button>
    </li>
  );
}
