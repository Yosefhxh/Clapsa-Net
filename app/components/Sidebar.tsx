// components/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, Truck, ChevronDown, ChevronRight 
} from "lucide-react"; 
import Image from "next/image";

export function Sidebar() {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  return (
    <div className="flex flex-col h-full bg-[#242B83] w-64 text-white shadow-lg">
      <div className="flex flex-col items-center pt-6 pb-4 px-6">
        <div className="relative w-full h-20 flex items-center justify-center">
            <Link href="/">
              <Image src="/logo.png" alt="Logo Clapsa" width={180} height={70} priority className="object-contain" />
            </Link>
        </div>
        <div className="w-full h-[1px] bg-white/20 mt-4"></div>
      </div>

      {/* Menu */}
      <div className="py-4 w-full">
        <h2 className="text-center text-[15px] font-medium text-white/50">Menu Principal</h2>
      </div>
      <div className="flex-1 px-6"> 
        <ul className="flex flex-col w-full space-y-1">
          <li className="w-full">
            <Link href="/" className={`flex items-center justify-start py-3 pl-3 space-x-4 w-full rounded-xl transition-all ${pathname === "/" ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10"}`}>
              <Home className="w-5 h-5" />
              <span className="font-medium text-[15px]">Home</span>
            </Link>
          </li>
          <li className="w-full">
            <button 
              onClick={() => toggleSubmenu("clientes")}
              className={`flex items-center justify-between py-3 pl-3 pr-4 w-full rounded-xl transition-all ${pathname.includes("/clientes") ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10"}`}
            >
              <div className="flex items-center space-x-4">
                <Users className="w-5 h-5" />
                <span className="font-medium text-[15px]">Clientes</span>
              </div>
              {openSubmenu === "clientes" ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>
            
            {openSubmenu === "clientes" && (
              <ul className="mt-1 ml-9 space-y-1 border-l border-white/20 pl-2">
                <li>
                  <Link href="/clientes/directo" className="block py-2 text-[14px] text-white/60 hover:text-white transition-colors">Directo</Link>
                </li>
                <li>
                  <Link href="/clientes/forwarder" className="block py-2 text-[14px] text-white/60 hover:text-white transition-colors">Forwarder</Link>
                </li>
              </ul>
            )}
          </li>
          <li className="w-full">
            <button 
              onClick={() => toggleSubmenu("proveedores")}
              className={`flex items-center justify-between py-3 pl-3 pr-4 w-full rounded-xl transition-all ${pathname.includes("/proveedores") ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10"}`}
            >
              <div className="flex items-center space-x-4">
                <Truck className="w-5 h-5" />
                <span className="font-medium text-[15px]">Proveedores</span>
              </div>
              {openSubmenu === "proveedores" ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
            </button>

            {openSubmenu === "proveedores" && (
              <ul className="mt-1 ml-9 space-y-1 border-l border-white/20 pl-2">
                <li>
                  <Link href="/proveedores/alta" className="block py-2 text-[14px] text-white/60 hover:text-white transition-colors">Alta</Link>
                </li>
                <li>
                  <Link href="/proveedores/busqueda" className="block py-2 text-[14px] text-white/60 hover:text-white transition-colors">Búsqueda</Link>
                </li>
              </ul>
            )}
          </li>

        </ul>
      </div>
    </div>
  );
}