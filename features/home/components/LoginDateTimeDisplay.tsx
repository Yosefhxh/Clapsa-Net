"use client";

import { Calendar } from "lucide-react";
import { useSession } from "@/features/session";

export function LoginDateTimeDisplay() {
  const { user } = useSession();
  if (!user) return null;

  const ingreso = new Date(user.inicioSesion).toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="clp-page-sub flex items-center gap-1.5 text-sm">
      <Calendar className="h-4 w-4" />
      <span suppressHydrationWarning>Ingreso: {ingreso}</span>
    </div>
  );
}
