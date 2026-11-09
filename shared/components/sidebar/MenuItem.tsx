import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface MenuItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}

export function MenuItem({ href, label, icon: Icon, isActive }: MenuItemProps) {
  return (
    <li className="shrink-0 md:w-11">
      <Link
        href={href}
        className={`clp-nav-item justify-start py-2.5 pl-3 pr-3 space-x-3 md:h-11 md:justify-center md:space-x-0 md:p-0 ${isActive ? "clp-nav-item-activa" : ""}`}
      >
        <Icon className="w-[18px] h-[18px] md:w-[25px] md:h-[25px]" />
        <span className="font-medium text-sm md:sr-only">{label}</span>
        <span aria-hidden="true" className="clp-nav-tip hidden md:block">
          {label}
        </span>
      </Link>
    </li>
  );
}
