import { ChevronRight, LucideIcon } from "lucide-react";
import { SubmenuItem } from "./SubmenuItem";

interface MenuLink {
  href: string;
  label: string;
}

interface MenuSectionBase {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type MenuSection = MenuSectionBase &
  ({ href: string } | { defaultHref: string; submenuItems: MenuLink[] });

interface MenuPanelProps {
  sections: MenuSection[];
  openSection: string | null;
  pathname: string;
  onOpenSection: (id: string) => void;
  onClose: () => void;
}

/** Menú completo de escritorio: se desliza desde atrás del marco azul. */
export function MenuPanel({
  sections,
  openSection,
  pathname,
  onOpenSection,
  onClose,
}: MenuPanelProps) {
  return (
    <div className="clp-cajon-marco hidden md:flex">
      <nav
        id="menu-completo"
        aria-label="Menú principal"
        data-menu-control
        data-abierto={openSection ? true : undefined}
        className="clp-cajon"
      >
        {sections.map((section) =>
          "href" in section ? (
            <ul key={section.id} className="clp-cajon-enlace">
              <SubmenuItem
                href={section.href}
                label={section.label}
                icon={section.icon}
                isCurrent={pathname === section.href}
                onSelect={onClose}
              />
            </ul>
          ) : (
            <div key={section.id}>
              <button
                type="button"
                aria-expanded={openSection === section.id}
                onClick={() => onOpenSection(section.id)}
                className={`clp-cajon-titulo ${openSection === section.id ? "clp-cajon-titulo-activo" : ""}`}
              >
                <section.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {section.label}
                <ChevronRight aria-hidden="true" className="clp-cajon-flecha" />
              </button>
              {openSection === section.id ? (
                <ul className="clp-cajon-sub">
                  {section.submenuItems.map((item) => (
                    <SubmenuItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      isCurrent={pathname === item.href}
                      onSelect={onClose}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ),
        )}
      </nav>
    </div>
  );
}
