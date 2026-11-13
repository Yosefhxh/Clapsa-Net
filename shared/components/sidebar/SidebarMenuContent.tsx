import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Truck,
  BriefcaseBusiness,
  UserRound,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/features/session";
import { MenuItem } from "./MenuItem";

interface MenuLink {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Destino al picar el icono. */
  href: string;
  /** Prefijo de ruta que deja el icono activo (incluye sus sub opciones). */
  match: string;
}

/** Cápsula de arriba: módulos de trabajo diario. */
const MENU_PRINCIPAL: MenuLink[] = [
  { id: "home", label: "Home", icon: Home, href: "/", match: "/" },
  { id: "clientes", label: "Clientes", icon: Building2, href: "/clientes/directo", match: "/clientes" },
  { id: "proveedores", label: "Proveedores", icon: Truck, href: "/proveedores", match: "/proveedores" },
  { id: "operaciones", label: "Operaciones", icon: BriefcaseBusiness, href: "/operaciones", match: "/operaciones" },
];

/** Cápsula de abajo: administración de la cuenta. */
const MENU_CUENTA: MenuLink[] = [
  { id: "usuarios", label: "Usuarios", icon: UserRound, href: "/usuarios", match: "/usuarios" },
  { id: "configuracion", label: "Configuración", icon: Settings, href: "/configuracion", match: "/configuracion" },
];

export function SidebarMenuContent() {
  const pathname = usePathname();
  const { avisos } = useSession();
  const n = (x: number, uno: string, varios: string) => `${x} ${x === 1 ? uno : varios}`;
  const aviso = (id: string) =>
    id === "clientes" && avisos?.encargosPorVencer ? { tono: "ambar" as const, texto: n(avisos.encargosPorVencer, "encargo por vencer", "encargos por vencer") }
    : id === "operaciones" && avisos?.operacionesUrgentes ? { tono: "coral" as const, texto: n(avisos.operacionesUrgentes, "urgente", "urgentes") }
    : null;

  const isActive = (match: string) =>
    match === "/" ? pathname === "/" : pathname === match || pathname.startsWith(`${match}/`);

  const renderItem = (item: MenuLink) => (
    <MenuItem
      key={item.id}
      href={item.href}
      label={item.label}
      icon={item.icon}
      isActive={isActive(item.match)}
      aviso={aviso(item.id)}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Celular: una sola fila horizontal. Desde tablet: dos cápsulas, arriba y abajo. */}
      <div className="flex min-h-0 flex-1 gap-1 overflow-x-auto px-4 py-2 md:flex-col md:justify-between md:gap-3 md:overflow-visible md:px-0 md:pt-(--clp-capsula-arriba) md:pb-(--clp-capsula-abajo)">
        <ul className="clp-capsula clp-capsula-principal flex max-md:shrink-0 max-md:gap-1" aria-label="Módulos">
          {MENU_PRINCIPAL.map(renderItem)}
        </ul>
        <ul className="clp-capsula clp-capsula-cuenta flex shrink-0 max-md:gap-1" aria-label="Cuenta">
          {MENU_CUENTA.map(renderItem)}
        </ul>
      </div>
    </div>
  );
}
