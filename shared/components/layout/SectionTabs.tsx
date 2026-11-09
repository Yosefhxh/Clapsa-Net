"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SectionTab {
  href: string;
  label: string;
}

interface SectionTabsProps {
  label: string;
  tabs: SectionTab[];
}

/** Sub opciones de un módulo (p. ej. Directo | Forwarder), debajo del título. */
export function SectionTabs({ label, tabs }: SectionTabsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="clp-subnav">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname.startsWith(tab.href) ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export const CLIENTES_TABS: SectionTab[] = [
  { href: "/clientes/directo", label: "Directo" },
  { href: "/clientes/forwarder", label: "Forwarder" },
];

export const PROVEEDORES_TABS: SectionTab[] = [
  { href: "/proveedores/alta", label: "Alta" },
  { href: "/proveedores/busqueda", label: "Búsqueda" },
];
