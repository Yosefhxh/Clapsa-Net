import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Truck,
  BriefcaseBusiness,
  UserRound,
} from "lucide-react";
import { MenuItem } from "./MenuItem";
import { SubmenuSection } from "./SubmenuSection";

export function SidebarMenuContent() {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  return (
    <>
      <div className="py-4 w-full">
        <h2 className="text-center text-[15px] font-medium text-white/50">
          Menu Principal
        </h2>
      </div>
      <div className="flex-1 px-6">
        <ul className="flex flex-col w-full space-y-1">
          <MenuItem
            href="/"
            label="Home"
            icon={Home}
            isActive={pathname === "/"}
          />

          <SubmenuSection
            label="Clientes"
            icon={Users}
            isOpen={openSubmenu === "clientes"}
            onToggle={() => toggleSubmenu("clientes")}
            isActive={pathname.includes("/clientes")}
            submenuItems={[
              { href: "/clientes/directo", label: "Directo" },
              { href: "/clientes/forwarder", label: "Forwarder" },
            ]}
          />

          <SubmenuSection
            label="Proveedores"
            icon={Truck}
            isOpen={openSubmenu === "proveedores"}
            onToggle={() => toggleSubmenu("proveedores")}
            isActive={pathname.includes("/proveedores")}
            submenuItems={[
              { href: "/proveedores/alta", label: "Alta" },
              { href: "/proveedores/busqueda", label: "Búsqueda" },
            ]}
          />

          <SubmenuSection
            label="Operaciones"
            icon={BriefcaseBusiness}
            isOpen={openSubmenu === "operaciones"}
            onToggle={() => toggleSubmenu("operaciones")}
            isActive={pathname.includes("/operaciones")}
            submenuItems={[
              {
                href: "/operaciones/despacho-aduanal",
                label: "Despacho aduanal",
              },
            ]}
          />

          <MenuItem
            href="/usuarios"
            label="Usuarios"
            icon={UserRound}
            isActive={pathname.includes("/usuarios")}
          />
        </ul>
      </div>
    </>
  );
}
