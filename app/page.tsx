"use client";

import { useState } from "react";
import { Package, Truck, Inbox,  type LucideIcon } from "lucide-react"; // Iconos para los widgets

type StatWidgetProps = {
  title: string;
  icon: LucideIcon;
};

function StatWidget({ title, icon: Icon }: StatWidgetProps) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="p-2.5 rounded-full bg-blue-50">
            <Icon className="w-5 h-5 text-aduanaBlue"/>
        </div>
      </div>
      <p className="text-4xl font-bold text-gray-900">0</p>
      <p className="text-xs text-gray-500 mt-1">Operaciones hoy</p>
    </div>
  );
}

export default function Home() {
  const [fechaIngreso] = useState<string>(() => {
    const INGRESO_KEY = "clapsa-fecha-ingreso";
    
    if (typeof window === "undefined") {
      return "";
    }
    
    const guardada = localStorage.getItem(INGRESO_KEY);
    
    if (guardada) {
      return guardada;
    }
    
    const ahora = new Date().toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    localStorage.setItem(INGRESO_KEY, ahora);
    return ahora;
  });

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-950">Tablero de Operaciones</h1>
        <p className="text-gray-600 mt-1">
          Bienvenido a Clapsa Net. {fechaIngreso && <span className="text-sm text-gray-500">(Ingreso: {fechaIngreso})</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatWidget title="Por despachar" icon={Package} />
        <StatWidget title="Ambos" icon={Package} />
        <StatWidget title="En vacío" icon={Inbox} />
        <StatWidget title="Tráfico Activo" icon={Truck} />
        <StatWidget title="Cartas Abiertas" icon={Inbox} />
        <StatWidget title="Cartas Cerradas" icon={Inbox} />
      </div>
       <div className="mt-12 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-6">Últimas Operaciones</h2>
            <p className="text-sm text-gray-500 text-center py-10">Aquí iría la tabla de operaciones recientes...</p>
       </div>
    </div>
  );
}