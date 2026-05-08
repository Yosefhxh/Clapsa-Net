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
    <li className="w-full">
      <div
        className={`flex items-center justify-between rounded-xl transition-all ${
          isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10"
        }`}
      >
        <Link href={defaultHref} className="flex flex-1 items-center gap-4 py-3 pl-3 pr-2">
          <Icon className="w-5 h-5" />
          <span className="font-medium text-[15px]">{label}</span>
        </Link>

        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? `Cerrar ${label}` : `Abrir ${label}`}
          className="mr-2 rounded-md p-1 text-white/60 transition hover:text-white"
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {isOpen && (
        <ul className="mt-1 ml-9 space-y-1 border-l border-white/20 pl-2">
          {submenuItems.map((item) => (
            <SubmenuItem key={item.href} href={item.href} label={item.label} />
          ))}
        </ul>
      )}
    </li>
  );
}
